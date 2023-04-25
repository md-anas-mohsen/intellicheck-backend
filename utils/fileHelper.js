const Busboy = require("busboy");
const csv = require("fast-csv");

exports.readCSV2JSON = (req, fileFieldName) => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });

    const options = {
      objectMode: true,
      quote: null,
      headers: true,
      renameHeaders: false,
    };

    let rows = [];

    busboy.on("file", (fieldName, file, fileName, encoding, mimeType) => {
      if (fieldName !== fileFieldName) {
        console.log("FILE MISSING, UPLOAD FILE WITH CORRECT NAME");
        resolve(null);
      }

      file
        .pipe(csv.parse(options))
        .on("data", (data) => {
          if (!!data) {
            rows.push(data);
          }
        })
        .on("end", () => {
          resolve(rows);
        })
        .on("error", () => reject);
    });

    req.pipe(busboy);
  });
};
