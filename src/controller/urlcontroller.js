const urlModel = require("../model/urlmodel");
const shortid = require("shortid");
const redis = require("redis");
const { promisify } = require("util");
const {
  isValid,
  isValidRequestBody,
  validUrl,
} = require("../validation/validate");

const redisClient = redis.createClient(
  12277,
  "redis-12277.c212.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("EQ52oLIpKpx8paSDkkO6GVnEUbh6p2An", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

exports.shortUrl = async function (req, res) {
  try {
    let requestBody = req.body;
    let { longUrl } = requestBody;
    if (!isValidRequestBody(requestBody)) {
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
        .send({ status: false, msg: "longUrl is not valid" });
    }

    let baseUrl = "http://localhost:3000";

    if (!validUrl.test(baseUrl)) {
      return res.status(400).send({ status: false, msg: "url not valid" });
    }

    let shortUrlCode = shortid.generate();

    let alreadyExist = await urlModel.findOne({ urlCode: shortUrlCode });
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

    let cahcedProfileData = await GET_ASYNC(`${req.body.longUrl}`);
    if (cahcedProfileData) {
      res.send(cahcedProfileData);
    } else {
      await SET_ASYNC(`${req.params.longUrl}`, JSON.stringify(urls));

      return res
        .status(201)
        .send({ status: true, message: "Short url created", data: urls });
    }
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

exports.getUrl = async function (req, res) {
  try {
    let urlCode = req.params.urlCode;
    let cahcedData = await GET_ASYNC(`${req.params.urlCode}`);
    if (cahcedData) {
      res.send(cahcedData);
    } else {
      
      let findUrlCode = await urlModel
        .findOne({ urlCode: urlCode })
        .select({ urlCode: 1, longUrl: 1, shortUrl: 1 });

      if (!findUrlCode) {
        return res
          .status(404)
          .send({ status: false, message: " url code not found." });
      }

      await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(findUrlCode));

      return res.status(302).redirect(findUrlCode.longUrl);
    }
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};
