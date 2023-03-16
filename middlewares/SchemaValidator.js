class SchemaValidator {
  // body(schema) {
  //   return (req, res, next) => {
  //     const { error, value } = schema.validate(req.body);

  //     if (error) {
  //       return res.status(200).json({
  //         success: false,
  //         message: error.details[0]?.message,
  //       });
  //     }
  //     next();
  //   };
  // },
  _validate(schema, type) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[type]);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0]?.message,
        });
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
