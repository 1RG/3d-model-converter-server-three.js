var THREE = require('./lib/three');
var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;
var JSZip = require('./lib/jszip.min');
var window = { DOMParser: true };
var TextDecoder = true;
eval(fs.readFileSync("lib/OBJLoader.js")+"");					//Original
eval(fs.readFileSync("lib/STLLoader.js")+"");					//Original
eval(fs.readFileSync("lib/3MFLoader.js")+"");					//Custom
eval(fs.readFileSync("lib/AMFLoader.js")+"");					//Custom
eval(fs.readFileSync("lib/AWDLoader.js")+"");					//Custom
eval(fs.readFileSync("lib/ColladaLoader.js")+"");			//Custom
eval(fs.readFileSync("lib/lzma.js")+"");							//Original
eval(fs.readFileSync("lib/ctm.js")+"");								//Original
eval(fs.readFileSync("lib/CTMLoader.js")+"");					//Custom
eval(fs.readFileSync("lib/PLYLoader.js")+"");					//Original
eval(fs.readFileSync("lib/VTKLoader.js")+"");					//Original
eval(fs.readFileSync("lib/Custom_XHRLoader.js")+"");

module.exports = {
	testJS: function(ext, data, method) {
		read(ext, data, method);
	}
}

function read(ext, data, serverREnd) {
	loadThreejsObject(ext, data, function(obj){
		var o = getThreeObjectRedy(obj);
		serverREnd(o);
	});
}

function loadThreejsObject(ext, data, method){
  switch (ext) {
		case "3mf":
			var loader = new THREE.ThreeMFLoader();
			load(loader, data);
			break;
		case "amf":
			var loader = new THREE.AMFLoader();
			load(loader, data);
			break;
		case "awd":
			var loader = new THREE.AWDLoader();
			load(loader, data);
			break;
		case "dae":
			var loader = new THREE.ColladaLoader();
			load_custom("dae", loader, data);
			break;
		case "ctm":
			var loader = new THREE.CTMLoader();
			custom_CTM_load_function();
			load_custom("ctm", loader, data);
			break;
    case "obj":
      var loader = new THREE.OBJLoader();
      load(loader, data);
      break;
		case "ply":
			var loader = new THREE.PLYLoader();
			load_geo(loader, data);
			break;
    case "stl":
      var loader = new THREE.STLLoader();
  		load_geo(loader, data);
  		break;
		case "vtk":
		case "vtp":
			var loader = new THREE.VTKLoader();
			load_geo(loader, data);
			break;
  }

  function load(loader, data){
		loader.load( data, function ( object ) {
			method(object);
		});
	}

  function load_geo(loader, data){
		var group = new THREE.Group();
		loader.load( data, function ( geometry ) {
			group.add(new THREE.Mesh(geometry, null));
			method(group);
		});
	}

	function load_custom(met, loader, data){
		var group = new THREE.Group();
		switch(met) {
			case "dae":
				loader.load( data, function ( object ) {
					object.scene.traverse( function ( child ) {
						if ( child instanceof THREE.Mesh ) {
							group.add(new THREE.Mesh(child.geometry, null));
						}
					});
					method(group);
				});
			break;
			case "ctm":
				loader.load( data, function ( geometry ) {
						group.add(new THREE.Mesh(geometry, null));

					method(group);
				});
			break;
		}
	}
}

function getThreeObjectRedy( object ) {
  var object;
  var geoArr;

  //set object scale
  object = convertObject( object );

  var singleGeometry = new THREE.Geometry();
  object.traverse( function ( child ) {
  	if ( child instanceof THREE.Mesh ) {
  		if(child.geometry.type == "Geometry"){
  			var geometry = child.geometry;
  		}else if(child.geometry.type == "BufferGeometry"){
  			var geometry = new THREE.Geometry().fromBufferGeometry( child.geometry );
  		}else{
  			return;
  		}
  		singleGeometry.merge( geometry );
  	}
  });

  singleGeometry.mergeVertices();
  console.log("mergeVertices DONE");

	convertFacesFlat(singleGeometry);
	console.log("convertFacesFlat DONE");

  geoArr = {
  		"metadata": {"adjust": {
  				"scale": object.scale.x,
  				"position": object.position,
  				"rotation": {
  					"x": object.rotation.x,
  					"y": object.rotation.y,
  					"z": object.rotation.z
  				}
  			}
  		},
  		"vertices": singleGeometry.toJSON()["data"]["vertices"],
  		"normals": singleGeometry.toJSON()["data"]["normals"],
			"colors": singleGeometry.toJSON()["data"]["colors"],
  		"uvs": singleGeometry.toJSON()["data"]["uvs"],
  		"faces": singleGeometry.toJSON()["data"]["faces"]
  	};

  return geoArr;

	function convertObject( object ){
		var obj = object.clone();
		var box = new THREE.Box3().setFromObject( obj );

		var maxSize = box.getSize().x;
		if( box.getSize().y > maxSize ){ maxSize = box.getSize().y;	}
		if( box.getSize().z > maxSize ){ maxSize = box.getSize().z; }

		var cSize = 1000 / maxSize;
		obj.scale.set( cSize, cSize, cSize );

		if( box.getCenter().y == 0 ){
			obj.position.y = box.getSize().y * cSize / 2;
		}else{
			obj.position.y = (( box.getCenter().y - ( box.getSize().y / 2 )) * (-1)) * cSize;
		}
		if( box.getCenter().x != 0 ){
  		obj.position.x = box.getCenter().x * (-1) * cSize;
  	}
  	if( box.getCenter().z != 0 ){
  		obj.position.z = box.getCenter().z * (-1) * cSize;
  	}

  	return obj;
  }

	function convertFacesFlat( geometry ) {
		for (var i = 0; i < geometry.faces.length; i++) {
			geometry.faces[i].normal = new THREE.Vector3(0, 0, 0);
			geometry.faces[i].vertexNormals = [];
			geometry.faces[i].color = new THREE.Color(1, 1, 1);
			geometry.faces[i].vertexColors = [];
			geometry.faces[i].materialIndex = 0;

			geometry.faceVertexUvs[0][i] = undefined;
		}
	}
}

function custom_CTM_load_function(){
	THREE.CTMLoader.prototype.load = function( url, callback, parameters ) {
		var scope = this;
		parameters = parameters || {};
		var offsets = parameters.offsets !== undefined ? parameters.offsets : [ 0 ];

		var fl = new THREE.FileLoader();
		fl.setResponseType("arraybuffer");
		fl.load(url, function(response) {
			var binaryData = new Uint8Array(response);
			for ( var i = 0; i < offsets.length; i ++ ) {
				var stream = new CTM.Stream( binaryData );
				stream.offset = offsets[ i ];
				var ctmFile = new CTM.File( stream );
				scope.createModel( ctmFile, callback );
			}
		});
	};
}

// FIXME: Code location
global.getStringFromAB = function(arrayBuffer){
//	String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
	var u8a = new Uint8Array(arrayBuffer);
	var r = "";
	for (var i = 0; i < u8a.length; i++) {
		r += String.fromCharCode(u8a[i]);
	}
	return r;
}

// FIXME: Code location
global.getDocumentElementChildren = function(documentElement){
	var c = [];
	var cn = documentElement.childNodes;
	for (var i = 0; i < cn.length; i++) {
		if(cn[i].nodeType == 1){
			c.push(cn[i]);
		}
	}
	return c;
}

// FIXME: Code location
global.getFirstElementChild = function(node) {
 var r = null;

 var c = [];
 var cn = node.childNodes;
 for (var i = 0; i < cn.length; i++) {
	 if(cn[i].nodeType == 1){
		 c.push(cn[i]);
	 }
 }

 var temp = c[0];
 r = temp;

 for (var i = 1; i < c.length; i++) {
	 temp["nextElementSibling"] = c[i];
	 temp = temp.nextElementSibling;
 }

 return r;
}
