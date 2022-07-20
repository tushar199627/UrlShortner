const urlModel = require("../model/urlmodel");
const shortid = require("shortid");
const {
  isValid,
  isValidRequestBody,
  validUrl,
} = require("../validation/validate");
const urlmodel = require("../model/urlmodel");

const redis=require("redis");
const {promisify}=require("util")

//Connect to redis
const redisClient = redis.createClient(
  11206,
  "redis-11206.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("msNot4FB6KiDYaVdjIoMcaHdUHXa7ubu", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});


//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

exports.shortUrl = async function (req, res) {
  try {
    let requestBody = req.body;
    let {longUrl}=requestBody
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

    let cahcedUrlData = await GET_ASYNC(`${req.body.longUrl}`)
  if(cahcedUrlData) {
   return res.status(200).send({status:true, data:cahcedUrlData})
  } 

    let alreadyExist = await urlmodel.findOne({ urlCode:shortUrlCode });
    if (alreadyExist) {
      return res.status(400).send({ status: false, msg: `${alreadyExist} already exist` });
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

    await SET_ASYNC(`${requestBody}`, JSON.stringify(urls))

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

    let cahcedUrlData = await GET_ASYNC(`${urlCode}`)

    const urlData=JSON.parse(cahcedUrlData)
    if(cahcedUrlData){
      return res.status(302).redirect(urlData.longUrl)
    }else {

    let findUrlCode = await urlModel
      .findOne({ urlCode: urlCode })
      .select({ urlCode: 1, longUrl: 1, shortUrl: 1 });

    if (!findUrlCode) {
      return res
        .status(404)
        .send({ status: false, message: " url code not found." });
    }
    await SET_ASYNC(`${urlCode}`, JSON.stringify(findUrlCode))
    return res.status(302).redirect(findUrlCode.longUrl);
  }
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};
