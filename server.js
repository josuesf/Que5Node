var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser')
var arrayConectados = []

const URL_DJANGO = 'http://omaralex.pythonanywhere.com'//'http://127.0.0.1:8000'

//Listen Server

var port = process.env.PORT || 8080;
var server = app.listen(port, function (err) {
	if (err) return console.log('Hubo un error'), process.exit(1);
	console.log('Escuchando en el puerto 3000');
})
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
var io = require('socket.io')(server);
function IdSocket(id_usuario) {
	//console.log(arrayConectados)
	//console.log(arrayConectados.find(u => u.idUsuario == id_usuario))
	let u = arrayConectados.find(u => u.idUsuario == id_usuario)

	return u ? u.socketId : undefined
}
app.post('/ws/get_estado_usuario/', function (req, res) {
	const campo = "saved." + req.body.id_usuario
	if (IdSocket(req.body.id_usuario)) {
		res.json({ respuesta: 'ok', estado: 'en linea' })
	} else {
		request.post(
			URL_DJANGO + '/ws/get_last_connected',
			{
				json: {
					usuario: req.body.id_usuario
				}
			},
			(error, response, body) => {
				console.log("ultima vez")
				console.log(body.data)
				res.json({ respuesta: 'ok', estado: body.data })
			}
		);
	}
})
io.sockets.on('connection', function (socket) {
	//console.log(io.sockets.connected[socket.id].emit("prueba",{}))
	console.log(socket.id)
	io.sockets.emit("prueba", { dato: "prueba" })

	socket.on('online', function (idUsuario) {
		/*arrayConectados.push({
			idUsuario:socket.id
		})*/
		console.log('SE CONECTO ' + idUsuario + ' con id ' + socket.id)
		let usuario = {
			idUsuario,
			socketId: socket.id
		}
		// arrayConectados[idUsuario] = socket.id
		if (IdSocket(idUsuario))
			arrayConectados.filter(p => {
				if (p.idUsuario == idUsuario) {
					p.socketId = socket.id
				}
				return p
			})
		else
			arrayConectados.push(usuario)
	})
	socket.on('disconnect', function () {
		console.log('DISCONNECT ' + socket.id)
		arrayConectados = arrayConectados.filter(u => u.socketId != socket.id)

	});
	socket.on('status_writing', function (data) {
		let id_socket = IdSocket(data.id_r)
		if (id_socket)
			io.sockets.connected[id_socket].emit('status_writing', { id_e: data.id_e, estado: data.estado })
	})

	socket.on('new_message', function (data) {
		request.post(
			URL_DJANGO + '/ws/send_message',
			{
				json: {
					id_mensaje: data.id_mensaje,
					mensaje: data.mensaje,
					tipo_mensaje: data.tipo_mensaje,
					timestamp: data.timestamp,
					estado_mensaje: data.estado_mensaje,
					id_e: data.id_e,
					id_r: data.id_r,
					id_g: data.id_g
				}
			},
			function (error, response, body) {
				console.log("begin send connected")
				console.log(body.data)
				//console.log(arrayConectados)
				var dataResponse = {}
				dataResponse['id_mensaje'] = body.data
				dataResponse['estado_mensaje'] = 'enviado'
				dataResponse['id_r'] = data.id_r
				//----- confirmacion al emisor
				// let id_socket_e = IdSocket(data.id_e)
				// if (id_socket_e)
					io.sockets.connected[socket.id].emit('status_message', dataResponse)
				//----- envio mensaje receptor
				let id_socket_r = IdSocket(data.id_r)
				//console.log(id_socket_r)
				if (id_socket_r)
					io.sockets.connected[id_socket_r].emit('new_message', data)
				console.log("end send connected")

			}
		);
	})

	socket.on('status_message', function (data) {
		// let estado = data.estado_mensaje
		// if(estado=='visto' && data)
		console.log(data)
		request.post(
			URL_DJANGO + '/ws/update_status_message',
			{
				json: {
					id_mensaje: data.id_mensaje,
					estado_mensaje: data.estado_mensaje,
				}
			},
			function (error, response, body) {

				//console.log(body)
				var dataResponse = {}
				dataResponse['id_mensaje'] = body.data.id_mensaje
				dataResponse['estado_mensaje'] = data.estado_mensaje

				//----- confirmacion al emisor
				let id_socket_e = IdSocket(body.data.id_e)
				if (id_socket_e)
					io.sockets.connected[id_socket_e].emit('status_message', dataResponse)
				//----- envio mensaje receptor
				io.sockets.connected[socket.id].emit('status_message', dataResponse)


			}
		);
	})

	socket.on('get_all_message', function (data) {
		console.log(data)


		request.post(
			URL_DJANGO + '/ws/get_all_message',
			{
				json: {
					id_usuario: data.id_usuario
				}
			},
			function (error, response, body) {
				socket.emit('get_all_message', body)
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
	socket.on('escribiendo', function (data) {
		console.log('alguien escribe a '+data.id_r)
		let id_socket_r = IdSocket(data.id_r)
		//console.log(id_socket_r)
		if (id_socket_r)
			io.sockets.connected[id_socket_r].emit('escribiendo', data)

	});
});

