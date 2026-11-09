import {
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { fail, digest, iso, accountOwner } from "./domain.js";
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});
function passwordHash(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    !/[a-z]/i.test(password) ||
    !/\d/.test(password)
  )
    fail(
      400,
      "INVALID_PASSWORD",
      "Usa una contraseña de 12 a 128 caracteres con al menos una letra y un número.",
    );
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
const dummySalt = "foxbus-constant-login-padding";
function normalizeEmail(email) {
  return typeof email === "string"
    ? email.toLowerCase().trim().replace(/\.+$/, "")
    : "";
}

export class AuthStore {
  constructor(store) {
    this.store = store;
    this.db = store.db;
  }
  register(
    { name, email, password, acceptTerms, policyVersion },
    role = "passenger",
  ) {
    const normalized = normalizeEmail(email);
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 150 ||
      normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    )
      fail(400, "INVALID_USER", "Revisa nombre y correo.");
    if (!["passenger", "agent", "finance", "boarding", "admin"].includes(role))
      fail(400, "INVALID_ROLE", "Rol invǭlido.");
    if (
      role === "passenger" &&
      (acceptTerms !== true || policyVersion !== this.store.policy().version)
    )
      fail(
        400,
        "TERMS_REQUIRED",
        "Acepta las condiciones y el aviso de privacidad.",
      );
    const hash = passwordHash(password);
    return this.store.transaction((now) => {
      if (this.db.prepare("SELECT id FROM users WHERE email=?").get(normalized))
        fail(409, "EMAIL_EXISTS", "Ese correo ya tiene una cuenta.");
      const user = {
        id: randomUUID(),
        name: name.trim(),
        email: normalized,
        role,
      };
      this.db
        .prepare(
          "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(user.id, user.name, user.email, hash, role, iso(now));
      if (role === "passenger")
        this.db
          .prepare(
            "INSERT INTO privacy_acceptances(owner_hash,version,accepted_at) VALUES (?,?,?)",
          )
          .run(accountOwner(user.id), policyVersion, iso(now));
      this.store.audit(user.id, "account_created", user.id, { role });
      return user;
    });
  }
  login(email, password) {
    const normalized = normalizeEmail(email);
    let user = this.db
      .prepare("SELECT * FROM users WHERE email=? AND active=1")
      .get(normalized);
    if (!user && typeof email === "string") {
      const legacy = email.toLowerCase().trim();
      if (legacy && legacy !== normalized)
        user = this.db
          .prepare("SELECT * FROM users WHERE email=? AND active=1")
          .get(legacy);
    }
    const [salt, expected] = (
      user?.password_hash || dummySalt + ":" + "0".repeat(128)
    ).split(":");
    const calculated = scryptSync(
      typeof password === "string" && password.length <= 128 ? password : "",
      salt,
      64,
    );
    if (!user || !timingSafeEqual(Buffer.from(expected, "hex"), calculated))
      fail(401, "INVALID_CREDENTIALS", "Correo o contrase��a incorrectos.");
    return publicUser(user);
  }
  startLogin(email, password) {
    const user = this.login(email, password);
    const challenge = randomBytes(32).toString("hex"),
      code = String(randomInt(0, 1000000)).padStart(6, "0"),
      now = this.store.clock();
    const clear = iso(now),
      expires = iso(now + 10 * 60000);
    this.db
      .prepare(
        "DELETE FROM login_challenges WHERE expires_at<=? OR used_at IS NOT NULL",
      )
      .run(clear);
    this.db
      .prepare(
        "INSERT INTO login_challenges(hash,user_id,code_hash,attempts,expires_at,used_at,created_at) VALUES (?,?,?,0,?,NULL,?)",
      )
      .run(
        digest(challenge),
        user.id,
        digest(challenge + ":" + code),
        expires,
        iso(now),
      );
    this.store.queueMail(
      accountOwner(user.id),
      user.email,
      "Código de verificación",
      `Tu código de verificación FoxBus es ${code}. Vence en 10 minutos. Si no iniciaste sesión, ignora este mensaje.`,
    );
    const [name, domain] = user.email.split("@");
    return {
      twoFactorRequired: true,
      challenge,
      email: name.slice(0, 1) + "***@" + domain,
      expiresInMinutes: 10,
      message:
        "Enviamos un código de verificación al correo de tu cuenta. Revisa también la carpeta de spam.",
    };
  }
  verifyLogin(challenge, code, previousToken) {
    const hash = digest(String(challenge || ""));
    return this.store.transaction((now) => {
      const row = this.db
        .prepare("SELECT * FROM login_challenges WHERE hash=?")
        .get(hash);
      if (!row || row.used_at)
        fail(410, "CHALLENGE_EXPIRED", "El código expiró. Inicia sesión otra vez.");
      if (row.expires_at <= iso(now))
        fail(410, "CHALLENGE_EXPIRED", "El código expiró. Inicia sesión otra vez.");
      if (Number(row.attempts) >= 5)
        fail(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Solicita un código nuevo.");
      if (!/^\d{6}$/.test(String(code || "")))
        fail(400, "INVALID_2FA_CODE", "Ingresa el código de 6 dígitos.");
      const expected = Buffer.from(row.code_hash, "hex");
      const received = Buffer.from(
        digest(String(challenge || "") + ":" + code),
        "hex",
      );
      if (!timingSafeEqual(expected, received)) {
        this.db
          .prepare("UPDATE login_challenges SET attempts=attempts+1 WHERE hash=?")
          .run(hash);
        fail(401, "INVALID_2FA_CODE", "El código no es correcto.");
      }
      const user = this.db
        .prepare("SELECT * FROM users WHERE id=? AND active=1")
        .get(row.user_id);
      if (!user) fail(401, "INVALID_CREDENTIALS", "La cuenta no está activa.");
      this.db
        .prepare("UPDATE login_challenges SET used_at=? WHERE hash=?")
        .run(iso(now), hash);
      return { user: publicUser(user), token: this.issue(user, previousToken) };
    });
  }
  issue(user, previousToken) {
    if (previousToken)
      this.db
        .prepare("DELETE FROM auth_sessions WHERE token_hash=?")
        .run(digest(previousToken));
    const token = randomBytes(32).toString("hex");
    this.db
      .prepare("INSERT INTO auth_sessions VALUES (?,?,?)")
      .run(digest(token), user.id, iso(this.store.clock() + 7 * 86400000));
    return token;
  }
  authenticate(cookie = "") {
    const token = /\bfoxbus_session=([a-f0-9]{64})\b/.exec(cookie)?.[1];
    if (!token) return null;
    const user = this.db
      .prepare(
        "SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
      )
      .get(digest(token), iso(this.store.clock()));
    return user ? publicUser(user) : null;
  }
  revoke(cookie = "") {
    const token = /\bfoxbus_session=([a-f0-9]{64})\b/.exec(cookie)?.[1];
    if (token)
      this.db
        .prepare("DELETE FROM auth_sessions WHERE token_hash=?")
        .run(digest(token));
  }
  require(user, roles) {
    if (!user) fail(401, "LOGIN_REQUIRED", "Inicia sesión.");
    if (roles && !roles.includes(user.role))
      fail(
        403,
        "ROLE_REQUIRED",
        "Tu cuenta no tiene permiso para esta operación.",
      );
    return user;
  }
  claimActive(guestOwner, user) {
    if (!guestOwner) return;
    return this.store.transaction(() => {
      const target = accountOwner(user.id);
      // La prueba de propiedad es la credencial del navegador, nunca un correo
      // coincidente. No se alteran estado, importe, asientos ni vencimientos.
      const grants = this.db
        .prepare(
          "SELECT reservation_code,expires_at FROM reservation_grants WHERE owner_hash=?",
        )
        .all(guestOwner);
      const upsert = this.db.prepare(
        "INSERT INTO reservation_grants(reservation_code,owner_hash,expires_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE expires_at=GREATEST(expires_at,VALUES(expires_at))",
      );
      for (const grant of grants)
        upsert.run(grant.reservation_code, target, grant.expires_at);
      this.db
        .prepare("DELETE FROM reservation_grants WHERE owner_hash=?")
        .run(guestOwner);
      const result = this.db
        .prepare("UPDATE reservations SET owner_hash=? WHERE owner_hash=?")
        .run(target, guestOwner);
      this.db
        .prepare("UPDATE service_requests SET owner_hash=? WHERE owner_hash=?")
        .run(target, guestOwner);
      this.db
        .prepare("UPDATE outbox SET owner_hash=? WHERE owner_hash=?")
        .run(target, guestOwner);
      this.db
        .prepare(
          "UPDATE privacy_acceptances SET owner_hash=? WHERE owner_hash=?",
        )
        .run(target, guestOwner);
      if (result.changes)
        this.store.audit(user.id, "guest_reservations_linked", "account", {
          count: result.changes,
        });
      return { linked: result.changes };
    });
  }
  updateStaff(id, { role, active, revokeSessions = false, reason }, actor) {
    this.require(actor, ["admin"]);
    const staffRoles = ["admin", "agent", "finance", "boarding"];
    if (
      !staffRoles.includes(role) ||
      typeof active !== "boolean" ||
      typeof revokeSessions !== "boolean" ||
      typeof reason !== "string" ||
      reason.trim().length < 10 ||
      reason.length > 500
    )
      fail(
        400,
        "INVALID_STAFF_UPDATE",
        "Indica rol, estado y un motivo de al menos 10 caracteres.",
      );
    return this.store.transaction(() => {
      const target = this.db
        .prepare("SELECT * FROM users WHERE id=? AND role!='passenger'")
        .get(id);
      if (!target)
        fail(404, "STAFF_NOT_FOUND", "Cuenta del personal no encontrada.");
      const removesAdmin =
        target.role === "admin" &&
        target.active === 1 &&
        (!active || role !== "admin");
      if (
        removesAdmin &&
        this.db
          .prepare(
            "SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1",
          )
          .get().n <= 1
      )
        fail(
          409,
          "LAST_ADMIN_REQUIRED",
          "Debe permanecer al menos un administrador activo.",
        );
      if (actor.id === id && (!active || role !== target.role))
        fail(
          409,
          "SELF_ACCOUNT_PROTECTED",
          "Otro administrador debe modificar tu propio rol o desactivarte.",
        );
      const changed = role !== target.role || Number(active) !== target.active;
      this.db
        .prepare("UPDATE users SET role=?,active=? WHERE id=?")
        .run(role, Number(active), id);
      const revoked =
        changed || revokeSessions
          ? this.db.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(id)
              .changes
          : 0;
      this.store.audit(actor.id, "staff_access_updated", id, {
        role,
        active,
        sessionsRevoked: revoked,
        reason: reason.trim(),
      });
      return {
        user: { ...publicUser({ ...target, role }), active },
        sessionsRevoked: revoked,
        message:
          "Permisos del personal actualizados; los cambios de acceso revocan sus sesiones.",
      };
    });
  }
  requestReset(email) {
    const normalized = normalizeEmail(email);
    let user = this.db
      .prepare("SELECT id,email FROM users WHERE email=? AND active=1")
      .get(normalized);
    if (!user && typeof email === "string") {
      const legacy = email.toLowerCase().trim();
      if (legacy && legacy !== normalized)
        user = this.db
          .prepare("SELECT id,email FROM users WHERE email=? AND active=1")
          .get(legacy);
    }
    if (user) {
      const token = randomBytes(32).toString("hex"),
        hash = digest(token);
      this.db
        .prepare(
          "INSERT INTO access_tokens(hash,kind,resource,expires_at,used_at) VALUES (?,'reset',?,?,NULL)",
        )
        .run(hash, user.id, iso(this.store.clock() + 30 * 60000));
      this.store.queueMail(
        accountOwner(user.id),
        user.email,
        "Recuperación de cuenta",
        this.store.publicUrl + "/recuperar?reset=" + token,
      );
    }
    return {
      message:
        "Si existe una cuenta, se registró el envío de un enlace de un solo uso. Revisa tu correo.",
    };
  }
  reset(token, password) {
    const hash = digest(String(token || "")),
      newHash = passwordHash(password);
    return this.store.transaction((now) => {
      const row = this.db
        .prepare(
          "SELECT * FROM access_tokens WHERE hash=? AND kind='reset' AND used_at IS NULL AND expires_at>?",
        )
        .get(hash, iso(now));
      if (!row)
        fail(410, "LINK_EXPIRED", "El enlace expiró o ya fue utilizado.");
      this.db
        .prepare("UPDATE users SET password_hash=? WHERE id=?")
        .run(newHash, row.resource);
      this.db
        .prepare("DELETE FROM auth_sessions WHERE user_id=?")
        .run(row.resource);
      this.db
        .prepare("UPDATE access_tokens SET used_at=? WHERE hash=?")
        .run(iso(now), hash);
      this.store.audit(row.resource, "password_reset", row.resource);
      return { message: "Contraseña actualizada. Inicia sesión nuevamente." };
    });
  }
}
