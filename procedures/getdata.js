const _ = require("lodash");
const { getPositions } = require("lodash-bzextras");
const { parser, arrayParser } = require("../helpers");
const fetch = window ? window.fetch : require("fetch");

/**
 * @param {object} data origins and targets data
 * @param {object} config procedure configuration
 * @param {object} config.to path to output
 * @param {string} config.url Path to url
 * @param {string?} config.method path to method default to get
 * @param {string?} config.body path to body
 * @param {string?} config.queryParams path to queryParams
 * @param {string?} config.headers path to headers object
 * @param {string?} config.redirect path to redirect [manual, *follow, error]
 * @param {string?} config.referrer path to referrer [no-referrer, *client]
 */
const gateDataHTTP = async function gateDataRest(data, config) {
  try {
    let url = _.get(data, config.url);
    let method = _.get(data, config.method);
    let headers = _.get(data, config.headers);
    let body = parser(_.get(data, config.body));
    let referrer = _.get(data, config.referrer) || "no-referrer";
    let redirect = parser(_.get(data, config.redirect)) || "follow";
    let mode = "cors";

    let queryParams = "";
    if (config.queryParams)
      queryParams +=
        "?" +
        Object.keys(config.queryParams)
          .map(k => k + "=" + config.queryParams[k])
          .join("&");
    let result = await fetch(url + queryParams, {
      method,
      headers,
      body,
      referrer,
      redirect,
      mode
    }).then(r => r.text());
    result = parser(result);
    arrayParser(config.to)
      .reduce((cu, c) => [...cu, ...getPositions(data, c)], [])
      .forEach(p => {
        _.set(data,p,result);
      });
    return false;
  } catch (e) {
    console.error(e);
    return e;
  }
};
module.exports = {
  gateDataHTTP
};
