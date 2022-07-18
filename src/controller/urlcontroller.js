const urlModel = require("../model/urlmodel");
const shortid = require("shortid");
const {
  isValid,
  isValidRequestBody,
  validUrl,
} = require("../validation/validate");
const urlmodel = require("../model/urlmodel");

exports.shortUrl = async function (req, res) {
  try {
    let longUrl = req.body.longUrl;

    if (!isValidRequestBody(longUrl)) {
      return res
        .status(400)
        .send({ status: false, msg: "input is not present" });
    }
    if (!isValid(longUrl)) {
      return res
        .status(400)
        .send({ status: false, msg: "longUrl is required" });
    }
    if (!validUrl.test(longUrl)) {
      return res
        .status(400)
        .send({ status: false, msg: "longUrl is required" });
    }

    let baseUrl = "http://localhost:3000";

    if (!validUrl.test(baseUrl)) {
      return res.status(400).send({ status: false, msg: "url not valid" });
    }

    let shortUrlCode = shortid.generate();

    let alreadyExist = await urlmodel.findOne({ longUrl });
    if (alreadyExist) {
      return res.status(400).send({ status: false, msg: `url already exist` });
    }

    let shortUrl = baseUrl + "/" + shortUrlCode;

    const allUrl = {
      longUrl: longUrl,
      shortUrl: shortUrl,
      urlCode: shortUrlCode,
    };

    let createdUrl = await urlModel.create(allUrl);

    let urls = {
      longUrl: createdUrl.longUrl,
      shortUrl: createdUrl.shortUrl,
      urlCode: shortUrlCode,
    };
    return res
      .status(201)
      .send({ status: true, message: "Short url created", data: urls });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

exports.getUrl = async function (req, res) {
  try {
    let urlCode = req.params.urlCode;

    let findUrlCode = await urlModel
      .findOne({ urlCode: urlCode })
      .select({ urlCode: 1, longUrl: 1, shortUrl: 1 });

    if (!findUrlCode) {
      return res
        .status(404)
        .send({ status: false, message: " url code NOT FOUND." });
    }

    return res.status(302).redirect(findUrlCode.longUrl);
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};
