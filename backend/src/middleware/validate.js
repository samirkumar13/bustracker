const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.errors[0]?.message ?? 'Validation error';
    return res.status(400).json({ error: msg });
  }
  req.body = result.data; // strip unknown keys
  next();
};

module.exports = validate;
