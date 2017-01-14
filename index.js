var express = require('express');
var app = express();
var fs = require("fs");

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

var suppFileE = ["3mf", "amf", "awd", "stl", "obj", "ply"];

var multer  = require('multer');

app.use(express.static('public'));

var opts = {
  dest: "tmp/",
  fileFilter: fileFilterF,
  limits: {
    fields: 0,
    fileSize: 31457280, //30MB Disc
    files: 1,
    parts: 1
  }
};

var upload = multer(opts).single("file");

app.post('/file_upload', function (req, res) {
  console.log("Response START");
  upload(req, res, function (err){
    if(err){
      var response = { msg: "", code: "" };
      if(err.code == "LIMIT_FILE_SIZE"){
        response.msg = "File exceeds the limit ( "+opts.limits.fileSize/1024/1024+"MB )";
        response.code = "LIMIT_FILE_SIZE";
      }else if (err.code == "NOT_ALLOWED_FORMAT") {
        response.msg = "File format ( "+err.format+" ) not allowed";
        response.code = "NOT_ALLOWED_FORMAT";
      }else{
        console.log("File Upload SYSTEM ERROR", err);
        response.msg = "Server file upload system error";
        response.code = "UPLOAD_SYSTEM_ERROR";
      }
      res.writeHead(500, {'Content-Type': 'application/json; charset=UTF-8'});
      res.end(JSON.stringify( response ));
      return
    }

    var fn = req.file.originalname;
    var extension = fn.substr(fn.lastIndexOf(".")+1).toLowerCase();

    if(extension == "obj"){
      objFileConvert(req.file.path);
      console.log("USE obj_fc");
    }

    fs.readFile(req.file.path, function(err, data) {
      fs.unlink(req.file.path);

      if(err){
        console.log("File reading SYSTEM ERROR",err);
        var response = {
          msg:'Server file reading system error',
          code: "READFILE_SYSTEM_ERROR"
        };
        res.writeHead(500, {'Content-Type': 'application/json; charset=UTF-8'});
        res.end(response);
      }
      if (data) {
        loadFileData(extension, data, function(obj_jr, status){

          res.writeHead(status, {'Content-Type': 'application/json; charset=UTF-8'});
          res.end(JSON.stringify(obj_jr));

          console.log("Response DONE");

          if (global.gc) {
            global.gc();
          } else {
            console.log('Garbage collection unavailable.');
          }
        });
      }
    });
  });
});

function fileFilterF(req, file, cb){
  var fn = file.originalname;
  var extension = "";
  var i = fn.lastIndexOf(".");
  if(i > 0){
    extension = fn.substr(i+1).toLowerCase();
    for (var j in suppFileE) {
      if(suppFileE[j] == extension){
        cb(null, true);
        return;
      }
    }
  }

  cb({
    Error: "File format not support",
    code: "NOT_ALLOWED_FORMAT",
    format: extension
  }, false);
}

function loadFileData(ext, data, method){
  var sc = require('./three_script');

  try {
    sc.testJS(ext, data, function(backText){
      method(backText, 200);
    });
  } catch (e) {
    console.log("THREE error", e);

    var response = {
      msg:"Server system does not understand file content",
      code: "READING_FILE_CONTENT_SYSTEM_ERROR"
    };
    method(response, 500);
  }
}

function objFileConvert(filePath) {
  var st = fs.readFileSync(filePath)+"";
  var lines = st.split( '\n' );
  var text = "";
  for (var i = 0; i < lines.length; i++) {
    var line = lines[ i ];
    var line0C = line.charAt( 0 );
    var line1C = line.charAt( 1 );

    if(line0C == "v" && line1C == " "){
      text += line + "\n";
    }

    if(line0C == "f" && line1C == " "){
      var t = "f";

      if(line.indexOf("/") == -1){
        text += line + "\n";
      }else{
        var s = line.split(" ");
        for (var j = 1; j < s.length; j++) {
          t += " "+s[j].substr(0, s[j].indexOf("/"));
        }
        text += t + "\n";
      }
    }
  }

  try {
    fs.truncateSync(filePath, 0);
    fs.writeFileSync(filePath, text);
  } catch (e) {
    console.log("ERROR .obj FileConvert");
  }
}

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);
