const ErrorHandler = require("../utils/errorHandler");

class SchemaValidator {
  _validate(schema, type) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[type]);

      if (error) {
        return next(new ErrorHandler(error.details[0]?.message, 400));
      }
      next();
    };
  }

  body(schema) {
    return this._validate(schema, "body");
  }

  query(schema) {
    return this._validate(schema, "query");
  }

  params(schema) {
    return this._validate(schema, "params");
  }
}

module.exports = SchemaValidator;
