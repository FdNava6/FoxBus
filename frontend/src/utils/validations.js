// ============================================
// validations.js
// Funciones de validación de formularios.
// ============================================

// Valida una dirección de correo electrónico
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Valida que la contraseña tenga al menos 6 caracteres
export const validatePassword = (password) => {
  return password.length >= 6;
};

// Valida un número de documento (DNI peruano de 8 dígitos)
export const validateDNI = (dni) => {
  const regex = /^\d{8}$/;
  return regex.test(dni);
};

// Devuelve mensaje de error o '' si es válido
export const getFieldError = (name, value) => {
  switch (name) {
    case 'email':
      if (!value) return 'El correo es obligatorio';
      if (!validateEmail(value)) return 'Ingresa un correo válido';
      return '';
    case 'password':
      if (!value) return 'La contraseña es obligatoria';
      if (!validatePassword(value)) return 'Mínimo 6 caracteres';
      return '';
    case 'dni':
      if (!value) return 'El DNI es obligatorio';
      if (!validateDNI(value)) return 'El DNI debe tener 8 dígitos';
      return '';
    default:
      return '';
  }
};