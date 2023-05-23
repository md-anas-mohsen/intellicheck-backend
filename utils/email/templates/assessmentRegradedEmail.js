const assessmentRegradedEmailTemplate = ({
  className,
  assessmentName,
  obtainedMarks,
  totalMarks,
}) => {
  return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" style="margin: 0; padding: 0;">
    
    <head>
      <title>
      </title>
      <!--[if !mso]><!-->
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--<![endif]-->
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
        #outlook a {
          padding: 0;
        }
    
        body {
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
    
        table,
        td {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
    
        img {
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
          -ms-interpolation-mode: bicubic;
        }
    
        p {
          display: block;
          margin: 13px 0;
        }
      </style>
      <!--[if mso]>
            <noscript>
            <xml>
            <o:OfficeDocumentSettings>
              <o:AllowPNG/>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
            </xml>
            </noscript>
            <![endif]-->
      <!--[if lte mso 11]>
            <style type="text/css">
              .mj-outlook-group-fix { width:100% !important; }
            </style>
            <![endif]-->
      <style type="text/css">
        @media only screen and (min-width:480px) {
          .mj-column-per-100 {
            width: 100% !important;
            max-width: 100%;
          }
        }
      </style>
      <style media="screen and (min-width:480px)">
        .moz-text-html .mj-column-per-100 {
          width: 100% !important;
          max-width: 100%;
        }
      </style>
      <style type="text/css">
        @media only screen and (max-width:480px) {
          table.mj-full-width-mobile {
            width: 100% !important;
          }
    
          td.mj-full-width-mobile {
            width: auto !important;
          }
        }
      </style>
    </head>
    
    <body style="margin: 0; padding: 0; background-color: #ff9700; word-spacing: normal;">
      <div style="margin: 0; padding: 0;">
        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="left-half-outlook" style="width:800px;" width="800" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div class="left-half" style="padding: 0; background-color: #ff9700; margin: 0px auto; max-width: 800px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0; padding: 0; width: 100%;" width="100%">
            <tbody style="margin: 0; padding: 0;">
              <tr style="margin: 0; padding: 0;">
                <td style="margin: 0; direction: ltr; font-size: 0px; padding: 20px 0; text-align: center;" align="center">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:800px;" ><![endif]-->
                  <div class="mj-column-per-100 mj-outlook-group-fix" style="margin: 0; padding: 0; font-size: 0px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0; padding: 0; vertical-align: top;" width="100%" valign="top">
                      <tbody style="margin: 0; padding: 0;">
                        <tr style="margin: 0; padding: 0;">
                          <td align="center" style="margin: 0; font-size: 0px; padding: 10px 25px; word-break: break-word;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0px;">
                              <tbody style="margin: 0; padding: 0;">
                                <tr style="margin: 0; padding: 0;">
                                  <td style="margin: 0; padding: 0; width: 750px;" width="750">
                                    <img height="auto" src="https://res.cloudinary.com/clicktobuy/image/upload/v1684794313/RapidCheck-logo_mb1wn5.png" style="margin: 0; padding: 0; border: 0; display: block; outline: none; text-decoration: none; height: auto; width: 100%; font-size: 13px;" width="750">
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="card-outlook" style="width:800px;" width="800" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div class="card" style="padding: 0; background-color: #fff; border-radius: 10px; width: 90vw; margin: 0px auto; max-width: 800px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0; padding: 0; width: 100%;" width="100%">
            <tbody style="margin: 0; padding: 0;">
              <tr style="margin: 0; padding: 0;">
                <td style="margin: 0; direction: ltr; font-size: 0px; padding: 20px 0; text-align: center;" align="center">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:800px;" ><![endif]-->
                  <div class="mj-column-per-100 mj-outlook-group-fix" style="margin: 0; padding: 0; font-size: 0px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0; padding: 0; vertical-align: top;" width="100%" valign="top">
                      <tbody style="margin: 0; padding: 0;">
                        <tr style="margin: 0; padding: 0;">
                          <td align="center" style="margin: 0; font-size: 0px; padding: 10px 25px; word-break: break-word;">
                            <div style="margin: 0; padding: 0; font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1; text-align: center; color: #000000;">
                              <h1 style="margin: 0; padding: 0; font-size: 2.5em;">Assessment Regraded!</h1>
                            </div>
                          </td>
                        </tr>
                        <tr style="margin: 0; padding: 0;">
                          <td align="center" style="margin: 0; font-size: 0px; padding: 10px 25px; word-break: break-word;">
                            <div style="margin: 0; padding: 0; font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1; text-align: center; color: #000000;">
                              <p style="margin: 0; padding: 0; font-size: 1.4em;">You have now scored</p>
                            </div>
                          </td>
                        </tr>
                        <tr style="margin: 0; padding: 0;">
                          <td align="center" style="margin: 0; font-size: 0px; padding: 10px 25px; word-break: break-word;">
                            <div style="margin: 0; padding: 0; font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1; text-align: center; color: #000000;">
                              <p style="margin: 0; padding: 0; font-size: 48px;"><strong style="margin: 0; padding: 0;">${obtainedMarks}/${totalMarks}</strong></p>
                            </div>
                          </td>
                        </tr>
                        <tr style="margin: 0; padding: 0;">
                          <td align="center" style="margin: 0; font-size: 0px; padding: 10px 25px; word-break: break-word;">
                            <div style="margin: 0; padding: 0; font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1; text-align: center; color: #000000;">
                              <p style="margin: 0; padding: 0; font-size: 1.4em;">on <strong style="margin: 0; padding: 0;">${assessmentName}</strong> in <strong style="margin: 0; padding: 0;">${className} after regrading</strong></p>
                            </div>
                          </td>
                        </tr>
                        <tr style="margin: 0; padding: 0;">
                          <td align="center" style="margin: 0; font-size: 0px; padding: 10px 25px; word-break: break-word;">
                            <div style="margin: 0; padding: 0; font-family: Montserrat, sans-serif; font-size: 13px; line-height: 1; text-align: center; color: #000000;">
                              <p style="margin: 0; padding: 0; font-size: 1.4em;">Regards,</p>
                              <p style="margin: 0; padding: 0; font-size: 1.4em;">RapidCheck</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><![endif]-->
      </div>
    </body>
    
    </html>
    `;
};

module.exports = assessmentRegradedEmailTemplate;
