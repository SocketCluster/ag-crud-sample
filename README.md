# sc-crud-sample

Scroll to the bottom for installation instructions.

A sample inventory tracking realtime single page app built with Asyngular (https://asyngular.io/), VueJS and RethinkDB.
It demonstrates a way of building realtime apps.

All code for the server-side worker logic is linked from worker.js - It's mostly generic so feel free to reuse/modify for your own app
or you can use this app as a base to build yours if starting from scratch.

Aside from Asyngular, VueJS and RethinkDB, this sample app uses the following modules:
- ag-collection (https://github.com/SocketCluster/ag-collection - ```npm install ag-collection```)
- ag-model (https://github.com/SocketCluster/ag-model - ```npm install ag-model```)
- ag-crud-rethink (https://github.com/SocketCluster/ag-crud-rethink - ```npm install ag-crud-rethink```)

This sample app aims to demonstrate all the cutting edge features that one might want when
building a realtime single page app including:

- Authentication (via JWT tokens)
- Access control using backend middleware
- Reactive data binding
- Realtime REST-like interface
- Pagination with realtime updates

Keep in mind that this app is optimized for cutting-edgeness, not for backwards
compatibility with older browsers.

To make the most of this demo, you should open the web app in two different tabs/windows/browsers and
make updates to the data in realtime.


## Installation

To setup and run this sample:

- Make sure you have Git installed (https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Make sure you have Node.js installed (http://nodejs.org/)
- Make sure you have RethinkDB installed (https://www.rethinkdb.com/)
- Run ```git clone https://github.com/SocketCluster/ag-crud-sample.git```
- Run ```cd ag-crud-sample``` (to navigate to the sc-crud-sample/ directory)
- Run ```npm install``` (to install back end modules)
- Run ```cd public && npm install && cd ..``` (to install front end modules inside the public/ directory)
- In a different terminal (or in the background), run ```sudo rethinkdb``` (make sure RethinkDB stays running)
- Run ```node server``` (to launch the server)
- In your browser, go to ```http://localhost:8000/```
