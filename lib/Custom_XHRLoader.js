//Custom from original three.js

var gResponseType = "";
THREE.FileLoader.prototype = {
  load: function(url, onLoad, onProgress, onError){
  //  if ( url === undefined ) url = '';
	//	if ( this.path !== undefined ) url = this.path + url;
    console.log("CXHR us load " + gResponseType);

    function setType(data, responseType){
      var response = null;
      try {
        this.responseType = gResponseType;

        var responseType = ( this.responseType || '' ).toLowerCase();

				switch ( responseType ) {
          case 'arraybuffer':
					case 'blob':
					 	response = new ArrayBuffer( data.length );
					  var view = new Uint8Array( response );
						for ( var i = 0; i < data.length; i ++ ) {
              view[ i ] = data[i];
						}

						if ( responseType === 'blob' ) {
							response = new Blob( [ response ], { "type" : mimeType } );
						}

						break;
					case 'document':
						var parser = new DOMParser();
						response = parser.parseFromString( data, mimeType );

						break;
					case 'json':
						response = JSON.parse( data );

						break;
					default: // 'text' or other
              response = data+"";
						break;
				}
			} catch ( error ) {
        console.log( error );
			}
      return response;
    }

    //###
    onLoad( setType(url, this.responseType) );
    //###
    gResponseType = "";
  },

  setPath: function ( value ) {
		this.path = value;
    console.log("CXHR us setPath");
    return this;
	},

  setResponseType: function ( value ) {
		this.responseType = value;
    gResponseType = value;
    console.log("CXHR us setResponseType :" + value);
    return this;
	},

	setWithCredentials: function ( value ) {
		this.withCredentials = value;
    console.log("CXHR us setWithCredentials");
		return this;
	}
}
