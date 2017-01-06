var THREE = require('./lib/three');
var fs = require('fs');
eval(fs.readFileSync("lib/OBJLoader.js")+"");					//Original
eval(fs.readFileSync("lib/STLLoader.js")+"");					//Original
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
    case "obj":
      var loader = new THREE.OBJLoader();
      load(loader, data);
      break;
    case "stl":
      var loader = new THREE.STLLoader();
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

  function getThreeObjectRedy( object ) {
  	console.log("start1", "getThreeObjectRedy");
  	var object;
  	var geoArr;

  	//set object scale
  	console.log(object.position);
  	object = convertObject( object );
  	console.log(object.position);

  	var singleGeometry = new THREE.Geometry();
  	object.traverse( function ( child ) {
  		if ( child instanceof THREE.Mesh ) {
  			if(child.geometry.type == "Geometry"){
  				var geometry = child.geometry;
  			}else if(child.geometry.type == "BufferGeometry"){
  				var geometry = new THREE.Geometry().fromBufferGeometry( child.geometry );
  			}else{
  				console.log("!!! Use oter geo: " + child.geometry.type);
  				return;
  			}
  			singleGeometry.merge( geometry );
  		}
  	});

  	singleGeometry.mergeVertices();
  	console.log("mergeVertices DONE");

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
  }
}
