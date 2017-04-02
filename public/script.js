var scene, camera, renderer;
var object, material;
var autoView = false;
var webgl_supp;

var langasId = _( "langas" );
var objectMetadata = [];
var view_name = "";

var canvasLibURLArr = [
	"lib/CanvasRenderer.js",
	"lib/Projector.js"
];

main()
webgl_supp = true;
if ( !Detector.webgl ){
  webgl_supp = false;
  loadLibrary( canvasLibURLArr, function() {
    viewInit();
  });
}else{
  viewInit();
}

function _(el){
  return document.getElementById(el);
}

function loadLibrary(arr, doneMethod){
	var arrNr = 0;
	if( arr.length != 0 ){
		sendAllRequest(arr[0]);
	}else{
		doneMethod();
	}
	function sendAllRequest( url ){
		arrNr++;
		var script = document.createElement('script');
		script.onload = function(){
			if(arrNr != arr.length){
				sendAllRequest(arr[arrNr]);
			}else{
				doneMethod();
			}
		}
		script.src = url;
		document.body.appendChild(script);
	}
}

function main(){
  _("uplId").addEventListener("click", function(){
    var file = _("fileId").files[0];

    if(file == null){
      _("up_info").innerHTML = "No file chosen";
      return;
    }

    var formdata = new FormData();
    formdata.append("file", file);
    var req = new XMLHttpRequest();
    req.upload.addEventListener("progress", function(e){
      var percent = Math.round((e.loaded / e.total) * 100);
      _("up_info").innerHTML = percent + "% uploaded...";
    }, false);

    req.addEventListener("load", function(res){
      if(req.status == 200){
        _("up_info").innerHTML = "Upload done";
        var data = res.target.responseText;
//        console.log(data);

        var blob = new Blob([data], {type: "application/json; charset=utf-8"});
        var url = URL.createObjectURL(blob);
        objectMetadata.push( JSON.parse( data ).metadata.adjust );

        addTabRow(_("tab"), file.name, data.length, url, blob);

        if(autoView){
          loadObject(url, objectMetadata.length - 1, file.name);
        }
     } else if(req.status == 500){
       _("up_info").innerHTML = JSON.parse(res.target.responseText).msg;
//       console.log(res.target.responseText);
     }
    }, false);

    req.addEventListener("abort", function(e){
      _("up_info").innerHTML = "Upload Aborted";
      console.log(e);
    }, false);

    req.addEventListener("error", function(e){
      _("up_info").innerHTML = "Upload Failed";
      console.log(e);
    }, false);

    req.open("POST", "/file_upload");
    req.send(formdata);
  }, false);

  buttonControl();

  function addTabRow(table, t_name, t_size, t_url, t_blob){
    var r = table.insertRow();

    var arr = [table.rows.length-1, t_name, size(t_size)];
    for (var i = 0; i < arr.length; i++) {
      var c = r.insertCell(i);
      c.appendChild(document.createTextNode(arr[i]));
    }

    var link0 = document.createElement("a");
    link0.appendChild(document.createTextNode(t_url));
    link0.setAttribute("href", t_url);
    link0.setAttribute("target", "_blank");

    var link1 = document.createElement("a");
    link1.appendChild(document.createTextNode("link"));
    link1.setAttribute("href", t_url);
    var i = t_name.lastIndexOf(".");
    link1.setAttribute("download", t_name.substr(0, i)+".json");

		//IE
		if(typeof window.navigator.msSaveOrOpenBlob != "undefined"){
			link1.addEventListener("click",function() {
				window.navigator.msSaveOrOpenBlob( t_blob );
			});
		}

    var but = document.createElement("button");
    but.appendChild(document.createTextNode("view"));
    var om = objectMetadata.length - 1;
    but.addEventListener("click", function(){
      _("wi_info").innerHTML = (om + 1) + "# loading...";
      loadObject(t_url, om, t_name);
    });

    var c0 = r.insertCell();
    c0.appendChild(link0);
    var c1 = r.insertCell();
    c1.appendChild(link1);
    var c1 = r.insertCell();
    c1.appendChild(but);

    function size(b){
      if(b < 1024){
        return b + " bytes";
      } else if (b < 1048576) {
        return Math.round((b / 1024) * 1000) / 1000 + " KB";
      } else {
        return Math.round((b / 1048576) * 1000) / 1000 + " MB";
      }
    }
  }
}

function viewInit() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 75, langasId.clientWidth / langasId.clientHeight, 1, 10000 );
  camera.position.x = 500;
	camera.position.y = 500;
	camera.position.z = 500;
	camera.lookAt( scene.position );

  var materialPro = {
    color: 0x00a100,
    side: THREE.DoubleSide,
    shading: THREE.FlatShading
  }
  if(webgl_supp){
    material = new THREE.MeshPhongMaterial(materialPro);
  }else{
    material = new THREE.MeshLambertMaterial(materialPro);
  }

	//Plane
  if(!webgl_supp){
    var size = 1000, step = 100;
  	var pGeometry = new THREE.Geometry();
  	for ( var i = - size; i <= size; i += step ) {
  		pGeometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
  		pGeometry.vertices.push( new THREE.Vector3(   size, 0, i ) );
  		pGeometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
  		pGeometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
  	}
  	var pMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 0.5 } );
  	var pLine = new THREE.LineSegments( pGeometry, pMaterial );
  	scene.add( pLine );
  }else{
		var planeGeometry = new THREE.PlaneGeometry(2000, 2000);
  	var planeMaterial = new THREE.MeshPhongMaterial({
  		color: 0xdcdcdc,
  		shininess: 10
  	});
  	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
  	plane.rotation.x = - Math.PI / 2;
  	plane.receiveShadow = true;
  	scene.add(plane);

  	//GridHelper
  	var grid = new THREE.GridHelper(1000, 20, new THREE.Color( 0xa10000 ), new THREE.Color( 0xf0f0f0 ));
  	scene.add(grid);
  }

	//Light
	scene.add( addLight( -1414, 1000, 0 ) );
	scene.add( addLight( 1000, 1000, 1000 ) );
	scene.add( addLight( 1000, 1000, -1000 ) );

  if( webgl_supp ){
  	renderer = new THREE.WebGLRenderer({
			preserveDrawingBuffer: true, //For canvas dataUrl
			antialias:true
		});
  	renderer.shadowMap.enabled = true;
  	renderer.shadowMapSoft = true;
  }else{
    renderer = new THREE.CanvasRenderer({ antialias:true });
  }
  renderer.setClearColor( 0xdddddd );
  renderer.setSize( langasId.clientWidth, langasId.clientHeight );

	//Mouse controls
	var controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.addEventListener( 'change', render );

	langasId.appendChild( renderer.domElement );

	render();
}

function addLight( pX, pY, pZ ){
  if(webgl_supp){
    var light = new THREE.SpotLight( 0xffffff );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 200;
    light.intensity = 0.7;
  }else{
    var light = new THREE.DirectionalLight( 0xffffff );
    light.intensity = 0.4;
  }

  light.position.set( pX, pY, pZ );

	light.angle = 1;
	light.penumbra = 0.06;
	light.decay = 1;
	light.distance = 4000;

	return light;
}

function loadObject(url, metaNr, o_name){
	var onProgress = function ( xhr ) {
		if ( xhr.lengthComputable ) {
			var percentComplete = xhr.loaded / xhr.total * 100;
      _("wi_info").innerHTML = (metaNr + 1) + "# " + Math.round(percentComplete, 2) + "% load";
			view_name = "";
		}
	};

	var onError = function ( xhr ) {
    _("wi_info").innerHTML = (metaNr + 1) + "# 3d view error";
		view_name = "";
	};

  var d = objectMetadata[metaNr];

  if(object != null){
    scene.remove(object);
  }

	var loader = new THREE.JSONLoader();
	loader.load( url, function ( geometry ) {
		object = new THREE.Mesh( geometry, material );

		object.scale.set( d.scale, d.scale, d.scale );

		object.position.x = d.position.x;
		object.position.y = d.position.y + 1;
		object.position.z = d.position.z;

		object.rotation.x = d.rotation.x;
		object.rotation.y = d.rotation.y;
		object.rotation.z = d.rotation.z;

    if(webgl_supp){
      object.castShadow = true;
    }

		scene.add( object );

		render();
    _("wi_info").innerHTML = (metaNr + 1) + "# done";
		view_name = o_name;
	}, onProgress, onError);
}

function buttonControl() {
  _("col_w").addEventListener("click", function(){
    setColor(0xffffff);
  });
  _("col_r").addEventListener("click", function(){
    setColor(0xa10000);
  });
  _("col_g").addEventListener("click", function(){
    setColor(0x00a100);
  });
  _("col_b").addEventListener("click", function(){
    setColor(0x0000a1);
  });
  _("col_bl").addEventListener("click", function(){
    setColor(0x000000);
  });

  _("anvId").checked = autoView;
  _("anvId").addEventListener("click", function(){
    autoView = _("anvId").checked;
  });

  if(document.mozFullScreenEnabled){
    document.addEventListener("mozfullscreenchange", onWindowResize);
  } else if(document.webkitFullscreenEnabled) {
    document.addEventListener("webkitfullscreenchange", onWindowResize);
  } else if(document.msFullscreenEnabled) {
    document.addEventListener("MSFullscreenChange", function(){
      var i = 0;
      var loop = setInterval(function(){
        if( i > 10 || (window.screen.width == langasId.clientWidth && window.screen.height == langasId.clientHeight) ){
          clearInterval(loop);
          onWindowResize();
        }
        i++;
      }, 100);
    });
  } else if(document.fullscreenEnabled) {
    document.addEventListener("fullscreenchange", onWindowResize);
  }

  _("fScreen").addEventListener("click", function(){
    var elem = langasId;
    if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  });

	_("dGrid").addEventListener("click", function(){
		if(scene != null){
			scene.children[0].visible = !scene.children[0].visible;
			if(scene.children[0].type == "Mesh"){
				scene.children[1].visible = !scene.children[1].visible;
			}

			if(scene.children[0].visible){
				_("dGrid").innerHTML = "Disable Grid";
			}else{
				_("dGrid").innerHTML = "Enable Grid";
			}

			render();
		}
	});

	var l = document.createElement('a');
	if(typeof l.download != "undefined"){
		var loop2 = setInterval(function(){
			if(renderer != null){
				if(renderer.domElement != null){
					clearInterval(loop2);

					var link = document.createElement('a');
					link.innerHTML = "Named download link";
					link.href = renderer.domElement.toDataURL();
			    link.download = "view.png";
					link.addEventListener("click", function(){
						link.href = renderer.domElement.toDataURL();
				    if(view_name != ""){
							link.download = view_name + "_view.png";
						}
					}, false);
					document.body.appendChild(link);

				}
			}
		}, 30);
	}

	_("gDImgScreen").addEventListener("click", function(){
		var image_data = atob(renderer.domElement.toDataURL().split(',')[1]);
		var arraybuffer = new ArrayBuffer(image_data.length);
		var view = new Uint8Array(arraybuffer);
		for (var i=0; i<image_data.length; i++) {
			view[i] = image_data.charCodeAt(i) & 0xff;
		}
		try {
			var blob = new Blob([arraybuffer], {type: 'application/octet-stream'});
		} catch (e) {
		  var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder);
		  bb.append(arraybuffer);
		  var blob = bb.getBlob('application/octet-stream');
		}

		//IE
		if(typeof window.navigator.msSaveOrOpenBlob != "undefined"){
			window.navigator.msSaveOrOpenBlob( blob );
		}else{
			var url = URL.createObjectURL(blob);
			location.href = url; //clears console
		}
	});

	_("gVImgScreen").addEventListener("click", function(){
		window.open(renderer.domElement.toDataURL(), "_blank");
	});

  function setColor(h) {
    if(object != null){
      object.material.color.setHex(h);
      render();
    }
  }
}

function onWindowResize() {
	camera.aspect = langasId.clientWidth / langasId.clientHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( langasId.clientWidth, langasId.clientHeight );
	render();
}

function render() {
	renderer.render( scene, camera );
}
