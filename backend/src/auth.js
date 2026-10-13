import {
  randomBytes,
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
    password.length > 128
  )
    fail(
      400,
      "INVALID_PASSWORD",
      "Usa una contraseña de entre 12 y 128 caracteres.",
    );
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
const dummySalt = "foxbus-constant-login-padding";
export class AuthStore {
  constructor(store) {
    this.store = store;
    this.db = store.db;
  }
  register(
    { name, email, password, acceptTerms, policyVersion },
    role = "passenger",
  ) {
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 150 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      fail(400, "INVALID_USER", "Revisa nombre y correo.");
    if (!["passenger", "agent", "finance", "boarding", "admin"].includes(role))
      fail(400, "INVALID_ROLE", "Rol inválido.");
    if (
      role === "passenger" &&
      (acceptTerms !== true || policyVersion !== this.store.policy().version)
    )
      fail(
        400,
        "TERMS_REQUIRED",
        "Acepta las condiciones y el aviso de privacidad.",
      );
    const normalized = email.toLowerCase().trim(),
      hash = passwordHash(password);
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
    const user = this.db
      .prepare("SELECT * FROM users WHERE email=? AND active=1")
      .get(typeof email === "string" ? email.toLowerCase().trim() : "");
    const [salt, expected] = (
      user?.password_hash || dummySalt + ":" + "0".repeat(128)
    ).split(":");
    const calculated = scryptSync(
      typeof password === "string" && password.length <= 128 ? password : "",
      salt,
      64,
    );
    if (!user || !timingSafeEqual(Buffer.from(expected, "hex"), calculated))
      fail(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos.");
    return publicUser(user);
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
      this.db
        .prepare(
          "INSERT INTO reservation_grants SELECT reservation_code,?,expires_at FROM reservation_grants WHERE owner_hash=? ON CONFLICT(reservation_code,owner_hash) DO UPDATE SET expires_at=MAX(expires_at,excluded.expires_at)",
        )
        .run(target, guestOwner);
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
    const user = this.db
      .prepare("SELECT id,email FROM users WHERE email=? AND active=1")
      .get(typeof email === "string" ? email.toLowerCase().trim() : "");
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
