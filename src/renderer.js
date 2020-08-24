const escpos = require('escpos');
const moment = require('moment');
const mqtt = require('mqtt');

const { dialog } = require('electron').remote

var title = document.title;
var btnTest = document.getElementById('btnTest');
var btnSave = document.getElementById('btnSave');
var btnStart = document.getElementById('btnStart');
var btnStop = document.getElementById('btnStop');

var txtPrinterId = document.getElementById('printerId');
var txtPrinterIp = document.getElementById('printerIp');
var txtNotifyServer = document.getElementById('notifyServer');
var txtNotifyUser = document.getElementById('notifyUser');
var txtNotifyPassword = document.getElementById('notifyPassword');

var txtLogs = document.getElementById('txtLogs');

var divOnline = document.getElementById('divOnline');
var divOffline = document.getElementById('divOffline');

var TOPIC = '';
var CLIENT;

// txtPrinterId.addEventListener('dblclick', (event) => {
//   var id = Math.round(Math.random() * 1000000);
//   txtPrinterId.value = id;
//   localStorage.setItem('printerId', txtPrinterId.value);

// });

btnTest.addEventListener('click', (event) => {
  event.preventDefault();
  txtPrinterIp.value = localStorage.getItem('printerIp') || '192.168.192.168';
  if (txtPrinterIp) {
    printTest();
  } else {
    dialog.showMessageBox({
      type: 'error',
      message: 'เกิดข้อผิดพลาด',
      detail: 'กรุณาระบุ Printer IP Address'
    });
  }
});

btnSave.addEventListener('click', (event) => {
  event.preventDefault();
  saveSetting();
});

btnStart.addEventListener('click', (event) => {
  event.preventDefault();
  txtLogs.value += `\n${moment().format('HH:mm:ss')} - Starting....`;
  txtLogs.scrollTop = txtLogs.scrollHeight;

  start();
});

btnStop.addEventListener('click', (event) => {
  event.preventDefault();
  txtLogs.value += `\n${moment().format('HH:mm:ss')} - Stopping....`;
  txtLogs.scrollTop = txtLogs.scrollHeight;

  stop();
});

function setTitle(text) {
  document.title = 'Q4U-PRINTER SERVER: ' + (text || '');
}

function init() {
  txtPrinterIp.value = localStorage.getItem('printerIp') || '192.168.192.168';
  txtPrinterId.value = localStorage.getItem('printerId') || Math.round(Math.random() * 1000000);
  txtNotifyServer.value = localStorage.getItem('notifyServer') || 'localhost';
  txtNotifyUser.value = localStorage.getItem('notifyUser') || 'q4u';
  txtNotifyPassword.value = localStorage.getItem('notifyPassword') || '##q4u##';

  divOffline.style.display = "block";
  divOnline.style.display = "none";

  btnStart.disabled = false;
  btnStop.disabled = true;

  const printerId = txtPrinterId.value;
  TOPIC = `/printer/${printerId}`;

}

function printTest() {
  const device = new escpos.Network(txtPrinterIp.value);

  const printer = new escpos.Printer(device);

  txtLogs.value += `\n${moment().format('HH:mm:ss')} - Print test....`;
  txtLogs.scrollTop = txtLogs.scrollHeight;

  device.open(function () {
    var dateTime = moment().locale('th').format('DD MMM YYYY HH:mm:ss');

    printer
      .model('qrprinter')
      .align('ct')
      .encode('tis620')
      .size(2, 1)
      .text('โรงพยาบาลทดสอบ')
      .text('ตรวจโรคทั่วไป')
      .text('')
      .size(1, 1)
      .text('ลำดับที่')
      .size(3, 3)
      .text('50009')
      .size(1, 1)
      .text('ผู้สูงอายุ')
      .qrimage('xxxx#9BE33IBFU#100010#01#50004#4#20190116#0012#ตรวจโรคทั่วไป', { type: 'png', mode: 'dhdw', size: 3 }, function (err) {
        this.text('จำนวนที่รอ 5 คิว')
        this.text('วันที่ ' + dateTime)
        this.text('**********************')
        this.text('สแกน QR CODE ผ่านแอปพลิเคชัน H4U')
        this.text('')
        this.encode('GB18030')
        this.text('HN')
        this.barcode('0041223', 'CODE39', "CODE128")
        this.text('')
        this.cut()
        this.close();
      })

  });
}

function saveSetting() {
  const printerIp = txtPrinterIp.value;
  const printerId = txtPrinterId.value;
  const notifyServer = txtNotifyServer.value;
  const notifyUser = txtNotifyUser.value;
  const notifyPassword = txtNotifyPassword.value;

  if (printerIp && printerId && notifyServer && notifyPassword && notifyUser) {
    localStorage.setItem('printerId', printerId);
    localStorage.setItem('printerIp', printerIp);
    localStorage.setItem('notifyServer', notifyServer);
    localStorage.setItem('notifyPassword', notifyPassword);
    localStorage.setItem('notifyUser', notifyUser);

    setTitle(printerId);

    dialog.showMessageBox({
      type: 'info',
      message: 'ผลการบันทึก',
      detail: 'บันทึกข้อมูลเสร็จเรียบร้อย กรุณาเริ่มโปรแกรมใหม่'
    });

  } else {
    dialog.showErrorBox('เกิดข้อผิดพลาด', 'ข้อมูลไม่ครบ กรุณาตรวจสอบ');
  }
}

function start() {
  const notifyServer = txtNotifyServer.value;
  const printerId = txtPrinterId.value;

  const mqttUsername = localStorage.getItem('notifyUser') || 'q4u';
  const mqttPassword = localStorage.getItem('notifyPassword') || '##q4u##';

  if (printerId && notifyServer) {

    TOPIC = `/printer/${printerId}`;

    setTitle(printerId);

    CLIENT = mqtt.connect('mqtt://' + notifyServer,
      {
        username: mqttUsername,
        password: mqttPassword
      });

    CLIENT.on('connect', function () {
      CLIENT.subscribe(TOPIC, function (err) {
        if (!err) {
          divOffline.style.display = "none";
          divOnline.style.display = "block";

          btnStart.disabled = true;
          btnStop.disabled = false;

          txtLogs.value += `\n${moment().format('HH:mm:ss')} - [NotifyServer] Connected.`;
          txtLogs.scrollTop = txtLogs.scrollHeight;

        } else {
          divOffline.style.display = "block";
          divOnline.style.display = "none";
          btnStart.disabled = false;
          btnStop.disabled = true;
          txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Connecting to Notify server.`;
          txtLogs.scrollTop = txtLogs.scrollHeight;
          console.log(err);
          CLIENT.end();
          dialog.showMessageBox({
            type: 'error',
            message: 'ผลการเชื่อมต่อ',
            detail: 'ไม่สามารถเชื่อมต่อ Notify Server ได้'
          });
        }
      })
    });

    CLIENT.on('message', function (topic, message) {
      var message = message.toString();
      if (message) {

        if (topic === TOPIC) {
          try {
            var json = JSON.parse(message);
            var queue = json;
            if (queue) {
              const singleSlipSso = queue.singleSlipSso || 0;
              if (singleSlipSso === 1) {
                printSso(queue);
              } else {
                const slipSso = queue.slipSso || 0;
                printQueue(queue);
                if (slipSso === 1) {
                  printSso(queue);
                }
              }
            } else {
              txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Queue not found.`;
              txtLogs.scrollTop = txtLogs.scrollHeight;
              console.log('Queue id not found!');
            }
          } catch (error) {
            txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Can't receive message.`;
            txtLogs.scrollTop = txtLogs.scrollHeight;
            console.log(error);
          }
        } else {
          txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Invalid topic.`;
          txtLogs.scrollTop = txtLogs.scrollHeight;
          console.log('Invalid topic!')
        }
      }
    });

    CLIENT.on('close', function () {
      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Connection closed.`;
      txtLogs.scrollTop = txtLogs.scrollHeight;

      divOffline.style.display = "block";
      divOnline.style.display = "none";

      btnStart.disabled = false;
      btnStop.disabled = true;
    });

    CLIENT.on('error', function () {
      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Connection error.`;
      txtLogs.scrollTop = txtLogs.scrollHeight;

      divOffline.style.display = "block";
      divOnline.style.display = "none";

      btnStart.disabled = false;
      btnStop.disabled = true;
    });

    CLIENT.on('offline', function () {

      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [ERROR] Connection offline.`;
      txtLogs.scrollTop = txtLogs.scrollHeight;

      divOffline.style.display = "block";
      divOnline.style.display = "none";

      btnStart.disabled = false;
      btnStop.disabled = true;
    });

  } else {
    dialog.showMessageBox({
      type: 'error',
      message: 'เกิดข้อผิดพลาด',
      detail: 'กรุณาระบุ Printer ID'
    });
  }
}

async function printQueue(queue) {
  try {

    const printerIp = localStorage.getItem('printerIp');
    const device = new escpos.Network(printerIp);
    const printer = new escpos.Printer(device);

    if (queue) {
      const printSmallQueue = queue.printSmallQueue || 'N';
      const hosname = queue.hosname;
      const queueNumber = queue.queueNumber;
      const servicePointName = queue.servicePointName;
      const remainQueue = queue.remainQueue || 0;
      const priorityName = queue.priorityName;
      const qrcode = queue.qrcode;
      const queueInterview = queue.queueInterview;
      const hn = queue.hn;
      const firstName = queue.firstName;
      const lastName = queue.lastName;

      const dateTime = moment().locale('th').format('DD MMM YYYY HH:mm:ss');

      device.open(function () {

        printer
          .model('qrprinter')
          .align('ct')
          .encode('tis620');

        if (printSmallQueue === 'Y') {
          printer
            .size(2, 1)
            .text(hosname)
            .text('')
            .text(servicePointName)
            .text('')
            .size(1, 1)
            .text('ลำดับที่')
            .text('')
            .size(3, 3)
            .text(queueNumber)
            .size(2, 1)
            .text('')
            .text('HN ' + hn)
            .size(1, 1)
            .text(firstName + ' ' + lastName)
            .text('')
            .cut()
        }

        printer
          .size(2, 1)
          .text(hosname)
          .text(servicePointName)
          .text('')
          .size(1, 1)
          .text('ลำดับที่')
          .text('')
          .size(3, 3)
          .text(queueNumber)
          // .text('')
          // .size(1, 1)
          // .text('คิวซักประวัติ')
          // .size(2, 2)
          // .text(queueInterview)
          .size(1, 1)
          .text('')
          .text(priorityName)
          .qrimage(qrcode, { type: 'png', mode: 'dhdw', size: 2 }, function (err) {
            this.text(`จำนวนที่รอ ${remainQueue} คิว`)
            this.text('วันที่ ' + dateTime)
            this.text('**********************')
            this.text('สแกน QR CODE ผ่านแอปพลิเคชัน H4U')
            this.text('')
            // this.encode('GB18030')
            // this.text('HN')
            // this.barcode(hn, 'CODE39', "CODE128")
            // this.text('')
            this.cut()
            this.close();
          })

      });

      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [PRINT] Success print queue number ${queueNumber}.`;
      txtLogs.scrollTop = txtLogs.scrollHeight;

    } else {
      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [PRINT] Queue number ${queueNumber} not found.`;
      txtLogs.scrollTop = txtLogs.scrollHeight;
    }

  } catch (error) {
    txtLogs.value += `\n${moment().format('HH:mm:ss')} - [PRINT] Error.`;
    txtLogs.scrollTop = txtLogs.scrollHeight;
    console.log(error);
  }
}

async function printSso(queue) {
  try {

    const printerIp = localStorage.getItem('printerIp');
    const device = new escpos.Network(printerIp);
    const printer = new escpos.Printer(device);

    if (queue) {
      const hosname = queue.hosname;
      const fullName = queue.fullName;
      const rightName = queue.rightName;
      const rightHospital = queue.rightHospital;
      const rightStartDate = queue.rightStartDate;
      const hn = queue.hn;

      const dateTime = moment().locale('th').format('DD MMM YYYY HH:mm:ss');

      device.open(function () {
        printer
          .model('qrprinter')
          .align('ct')
          .encode('tis620')
          .size(2, 1)
          .text(hosname)
          .size(1, 1);

        printer
          .text('')
          .style('u')
          .text('HN')
          .style('b')
          .text(hn ? hn : 'ไม่พบข้อมูล CID');

        printer
          .text('')
          .style('u')
          .text('ชื่อ-นามสกุล')
          .style('b')
          .text(fullName)
          .text('')
          .style('u')
          .text('สิทธิการรักษาพยาบาล')
          .style('b')
          .text(rightName)
          .text('')
          .style('u')
          .text('วันที่เริ่มใช้สิทธิ์')
          .style('b')
          .text(rightStartDate)
          .text('')
          .style('u')
          .text('หน่วยบริการหลัก')
          .style('b')
          .text(rightHospital)
          .text('');

        if (hn) {
          printer.barcode(hn, 'CODE39', { height: 50, font: 'B' });
        }

        printer.text('')
          .cut()
          .close();
      });

      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [PRINT] Success print.${fullName}`;
      txtLogs.scrollTop = txtLogs.scrollHeight;

    } else {
      txtLogs.value += `\n${moment().format('HH:mm:ss')} - [PRINT] not found.`;
      txtLogs.scrollTop = txtLogs.scrollHeight;
    }

  } catch (error) {
    txtLogs.value += `\n${moment().format('HH:mm:ss')} - [PRINT] Error.`;
    txtLogs.scrollTop = txtLogs.scrollHeight;
    console.log(error);
  }
}

function stop() {
  txtLogs.value += `\n${moment().format('HH:mm:ss')} -  Stopping...`;
  txtLogs.scrollTop = txtLogs.scrollHeight;

  try {
    CLIENT.unsubscribe(TOPIC);
    CLIENT.end();
  } catch (error) {
    txtLogs.value += `\n${moment().format('HH:mm:ss')} -  STOP ERROR: ${error.message}`;
    txtLogs.scrollTop = txtLogs.scrollHeight;
    console.log(error);
  }
}

// initial setting
init();
