var express = require("express");
var mongo = require("mongodb").MongoClient;
var https = require("https");
var fs = require("fs");

var db = mongo.connect("mongodb://localhost:27017/db");
var app = express();

app.get(/\/api\/imagesearch\/([^?]*)/, function(req, res) {
    var search = req.params[0];
    var offset = req.query.offset;
    if (isNaN(offset) || parseInt(offset) < 1) {
        offset = 1;
    }
    imageSearch(search, offset).then(function(val) {
        var results = parse(val);
        res.json(results);
        res.end();
    });
    getQueries().then(function(queries) {
        queries.insertOne({_id: Date.now(), query: search});
    })
});
app.get("/api/latest/imagesearch", function(req, res) {
    getQueries().then(function(queries) {
        queries.find({}).sort({_id:-1}).limit(10).toArray(function(err, docs) {
            docs = docs.map(function(item) {
                return {query: item.query, when: item._id};
            });
            res.json(docs);
            res.end();
        });
    });
});

function imageSearch(query, offset) {
    var results = new Promise(function(fulfill, reject) {
        https.get(
                "https://www.googleapis.com/customsearch/v1?q=" + query
                + "&searchType=image&cx=005088747967949360320:9dqqjsgtsls"
                + "&key=AIzaSyD795TmiKVysc0TeTpRsHNLirovhwBUZO0"
                + "&start=" + offset,
                function(response) {
                    var partialResult = "";
                    response.on("data", function(chunk) {
                        partialResult = partialResult.concat(chunk.toString());
                    });
                    response.on("end", function() {
                        fulfill(partialResult);
                    });
                }
        );
    });
    return results;
}

function parse(text) {
    var items = JSON.parse(text).items;
    function beautify(imageObj) {
        return {image_url:imageObj.link, alt_text:imageObj.snippet,
                page_url:imageObj.image.contextLink};
    }
    return items.map(beautify);
}

function getQueries() {
    var queries = new Promise(function(fulfill, reject) {
        db.then(function(res) {
            res.collection("queries", function(err, collection) {
                if (err) console.log(err);
                fulfill(collection);
            });
        });
    });
    return queries;
}

app.listen(8080);
