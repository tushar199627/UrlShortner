const urlmodel = require("../model/urlmodel");
const shortid = require("shortid");
const {
  isValid,
  isValidRequestBody,
  validUrl,
} = require("../validation/validate");

const redis = require("redis"); //requiring redis using npm i redis@3.1.2
const { promisify } = require("util"); //requiring util using npm i util

//Connect to redis
const redisClient = redis.createClient(
  11206,
  "redis-11206.c301.ap-south-1-1.ec2.cloud.redislabs.com", //userdetails in redislab
  { no_ready_check: true }
);
redisClient.auth("msNot4FB6KiDYaVdjIoMcaHdUHXa7ubu", function (err) {
  //password for user in redislab
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

//Connection setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//post api to convert the long url to short url
exports.shortUrl = async function (req, res) {
  try {
    let requestBody = req.body; //getting data from requesr body

    let { longUrl } = requestBody; //destructured the request body

    if (!isValidRequestBody(requestBody)) {
      //validating their is any input in the request body or not
      return res
        .status(400)
        .send({ status: false, msg: "input is not present" });
    }

    //validation starts
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

    let baseUrl = "http://localhost:3000"; //creating the base url

    if (!validUrl.test(baseUrl)) {
      return res.status(400).send({ status: false, msg: "url not valid" }); //checking wheather the base url is valid url or not
    }

    let shortUrlCode = shortid.generate(); //generating the shortid for the long url

    let cahcedUrlData = await GET_ASYNC(`${req.body.longUrl}`);
    if (cahcedUrlData) {
      const urlData = JSON.parse(cahcedUrlData);
      return res.status(200).send({ status: true, data: urlData }); //it is basically cache hit
    }

    let alreadyExist = await urlmodel.findOne({longUrl});
    if (alreadyExist) {
      return res
        .status(400)
        .send({ status: false, msg: `${longUrl} already exist` }); //checking wheather the shorturlcode is present in the db or what, as the code should be unique
    }

    let shortUrl = baseUrl + "/" + shortUrlCode; //concatenating the base url with the shortcode to create a short url

    const allUrl = {
      longUrl: longUrl,
      shortUrl: shortUrl,
      urlCode: shortUrlCode,
    };

    let createdUrl = await urlmodel.create(allUrl);

    let urls = {
      longUrl: createdUrl.longUrl,
      shortUrl: createdUrl.shortUrl,
      urlCode: shortUrlCode,
    };

    await SET_ASYNC(`${longUrl}`, JSON.stringify(urls)); //it is basically a cache miss, so we are setting up in the cache

    return res
      .status(201)
      .send({ status: true, message: "Short url created", data: urls });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

//get api to redirect to the long url with the urlcode
exports.getUrl = async function (req, res) {
  try {
    let urlCode = req.params.urlCode; //getting the data in the params

    let cahcedUrlData = await GET_ASYNC(`${urlCode}`); //it is basically cache hit

    //converting to object

    if (cahcedUrlData) {
      const urlData = JSON.parse(cahcedUrlData);
      return res.status(302).redirect(urlData.longUrl); //if data is present in the cache then directly redirect it from cache
    } else {
      let findUrlCode = await urlmodel
        .findOne({ urlCode: urlCode })
        .select({ urlCode: 1, longUrl: 1, shortUrl: 1 }); //or take it from the db

      if (!findUrlCode) {
        return res
          .status(404)
          .send({ status: false, message: " url code not found." });
      }
      await SET_ASYNC(`${urlCode}`, JSON.stringify(findUrlCode)); // set the data in the cache and return in the response
      return res.status(302).redirect(findUrlCode.longUrl);
    }
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};
