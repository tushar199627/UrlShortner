let isValid = function (value) {
  
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "number" && value.toString().trim().length === 0)
    return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};

let isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};

let validUrl =/^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;

module.exports = { isValid, isValidRequestBody, validUrl };
