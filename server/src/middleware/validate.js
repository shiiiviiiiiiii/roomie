const { z } = require('zod');

// Re-export zod for route schemas.
module.exports.z = z;

/**
 * validate(schema) — Express middleware that validates req.body (and optionally
 * req.params / req.query) against zod schema(s).
 *
 * Accepts either a single zod schema (treated as the body schema) or an object
 * { body, params, query }. On failure it responds 400 with the first human
 * readable issue message. Compatible with zod v3 and v4 error shapes.
 */
function validate(schema) {
  const schemas =
    schema && typeof schema === 'object' && !(schema instanceof z.ZodType)
      ? schema
      : { body: schema };

  return (req, res, next) => {
    for (const [part, partSchema] of Object.entries(schemas)) {
      if (!partSchema) continue;
      const target = part === 'body' ? req.body : part === 'params' ? req.params : req.query;
      const result = partSchema.safeParse(target);
      if (!result.success) {
        const issues = result.error.issues || result.error.errors || [];
        const message = issues[0]
          ? `${issues[0].path.length ? issues[0].path.join('.') + ': ' : ''}${issues[0].message}`
          : 'Invalid request';
        return res.status(400).json({ error: message });
      }
      // Replace with the parsed (coerced / stripped) value so handlers
      // receive clean types. Never assign undefined for params/query objects
      // Express treats specially; body replacement is safe.
      if (part === 'body') req.body = result.data;
    }
    next();
  };
}

// Common id param schema for :id routes. Firestore document IDs are opaque
// strings (auto-IDs), never integers.
const idParam = z.object({ id: z.string().trim().min(1, 'id is required').max(128) });

module.exports.validate = validate;
module.exports.idParam = idParam;
