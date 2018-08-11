var express = require('express');
var app = express(); 
var request = require('request');
var arrayConectados = {}//[]

const URL_DJANGO =  'http://127.0.0.1:8000'

//Listen Server

var port = process.env.PORT || 8080;
var server = app.listen(port, function (err) {
	if (err) return console.log('Hubo un error'), process.exit(1);
	console.log('Escuchando en el puerto 3000');
})
var io = require('socket.io')(server);
io.sockets.on('connection', function (socket) {
	//console.log(io.sockets.connected[socket.id].emit("prueba",{}))
	console.log(socket.id)
	io.sockets.emit("prueba",{dato:"prueba"})

	socket.on('online',function(idUsuario){
		/*arrayConectados.push({
			idUsuario:socket.id
		})*/
		console.log(idUsuario)
		arrayConectados[idUsuario]=socket.id
	})

	socket.on('status_writing',function(data){ 
		io.sockets.connected[arrayConectados[data.id_r]].emit('status_writing',{id_e:data.id_e,estado:data.estado})
	})

	socket.on('new_message',function(data){
		request.post(
				URL_DJANGO + '/ws/send_message',
				{ 
					json: {  
						id_mensaje : data.id_mensaje,
						mensaje : data.mensaje,
						tipo_mensaje : data.tipo_mensaje,
						timestamp : data.timestamp,
						estado_mensaje : data.estado_mensaje,
						id_e : data.id_e,
						id_r : data.id_r,
						id_g : data.id_g
					} 
				},
				function (error, response, body) {
					console.log("begin send connected")
					console.log(data)
					console.log(arrayConectados) 
					var dataResponse = {}
					dataResponse['id_mensaje'] = body.data
					dataResponse['estado_mensaje'] = 'enviado'
					dataResponse['id_r'] = data.id_r

					//----- confirmacion al emisor
					io.sockets.connected[arrayConectados[data.id_e]].emit('status_message',dataResponse)
					//----- envio mensaje receptor
					io.sockets.connected[arrayConectados[data.id_r]].emit('new_message',data)
					console.log("end send connected") 
					 
				}
		);
	})

	socket.on('status_message',function(data){
		request.post(
				URL_DJANGO + '/ws/update_status_message',
				{ 
					json: {  
						id_mensaje : data.id_mensaje,
						estado_mensaje : data.estado_mensaje,
					} 
				},
				function (error, response, body) {
					 
						console.log("status"+arrayConectados) 
						var dataResponse = {}
						dataResponse['id_mensaje'] = body.data.id_mensaje
						dataResponse['estado_mensaje'] = data.estado_mensaje//+'_receptor'

						//----- confirmacion al emisor
						io.sockets.connected[arrayConectados[body.data.id_e]].emit('status_message',dataResponse)
						//----- envio mensaje receptor
						//io.sockets.connected[arrayConectados[data.id_r]].emit('s',data)
 
					
				}
		);
	})

	socket.on('get_all_message', function(data){
		console.log(data)
	 
		 
		request.post(
			URL_DJANGO + '/ws/get_all_message',
			{ 
				json: { 
					id_usuario: data.id_usuario 
				} 
			},
			function (error, response, body) {
				socket.emit('get_all_message',body)
				console.log(body)
			}
		);
 
		//res.send(returndata);


		/*var data = { // this variable contains the data you want to send
			data1: "foo",
			data2: "bar"
		}
	 
		var options = {
			method: 'POST',
			uri: 'http://yourflaskserverIPorURL:port/postdata',
			body: data,
			json: true // Automatically stringifies the body to JSON
		};
		
		var returndata;
		var sendrequest = await request(options)
		.then(function (parsedBody) {
			console.log(parsedBody); // parsedBody contains the data sent back from the Flask server
			returndata = parsedBody; // do something with this data, here I'm assigning it to a variable.
		})
		.catch(function (err) {
			console.log(err);
		});
		
		res.send(returndata);*/
	});
});
  
