#!usr/bin/env python
# -*- coding: utf-8 -*-

import asyncio
import datetime
import random
import websockets

async def hello(websocket, path):
	print("serve start...")
	msg = await websocket.recv()
	print(msg)
	count = 0
	while True:
		now = datetime.datetime.utcnow().isoformat() + 'z'
		if msg == 'ping':
			# heart checking
			await websocket.send(now)
		else:
			await websocket.send(now)
		await asyncio.sleep(random.random() * 10)
		count += 1
		if count == 5:
			print(8888)
			await asyncio.sleep(61)
			# await websocket.close()
			# break


start_server = websockets.serve(hello, '10.224.210.115', 5000)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

