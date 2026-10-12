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
    this.db
      .prepare(
        "INSERT OR REPLACE INTO reservation_grants SELECT reservation_code,?,expires_at FROM reservation_grants WHERE owner_hash=?",
      )
      .run(accountOwner(user.id), guestOwner);
    this.db
      .prepare("DELETE FROM reservation_grants WHERE owner_hash=?")
      .run(guestOwner);
    this.db
      .prepare(
        "UPDATE reservations SET owner_hash=? WHERE owner_hash=? AND status='active_session'",
      )
      .run(accountOwner(user.id), guestOwner);
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
