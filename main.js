/*
*/

// electron-packager . shortexts --platform=darwin --arch=all --overwrite  --icon=img/icon_app.png.icns

//SIGN: codesign --deep --force --verbose --sign "<identity>" Application.app
//VERIFY: codesign --verify -vvvv Application.app  //  spctl -a -vvvv Application.app

var debug = false;
var version = current_version = "0.1.0";
var app_package_name = "Shortexts"
var app_title = "Shortexts";

require('shelljs/global');

const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const Tray = electron.Tray;
const Menu = electron.Menu;
const MenuItem = electron.MenuItem;
const globalShortcut = electron.globalShortcut;
const clipboard = electron.clipboard;
const remote = electron.remote;
const storage = require('electron-json-storage');
const AutoLaunch = require('auto-launch');
const shell = require('electron').shell;
const fileExists = require('file-exists');
const pathExists = require('path-exists');
//var tripledes = require("crypto-js/tripledes");
var CryptoJS = require("crypto-js");
var control_key = "this is a control key";
var control_key_encrypted = "";





var mainWindow;
var dumbWindow;
var search_window = null;
var about_window = null;
var update_window = null;
var ask_password_window = null;
var first_time_window = null;
const ipcMain = require('electron').ipcMain;

var Options = {};
var contextMenu = false;
var app_path = null;
var donation_url = 'https://www.paypal.me/carlosrm/2.99';
var app_url = 'http://shortexts.com';
var app_url_version = 'http://shortexts.com/current_version.json';
var appLauncher = null;
var press_intro = false;

var icon = 'icon2';







// borrar pass
//deleteOption('master_password_encrypted');
/**/







/************************************************************************************/
/************************************************************************************/
/*************************** ENCr Functions *****************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/



var get_value_to_decrypt = function(){}

function encrypt_value(value,password){
  var encrypted_master_password = getOptions().master_password_encrypted;
  if(!encrypted_master_password) return false;
  var master_password = decrypt(encrypted_master_password,password);
  if(!master_password) return false;
  if(debug)  console.log( 'check correct password '+password);
  if(!check_correct_user_password(password)) return false;

  if(debug)  console.log('about to encrypt _'+value+'_ with _'+password);
  var encrypted_value = encrypt(value,master_password);
  master_password = "xxx";
  return encrypted_value;
}
function encrypt_value_without_master(value,password){
  var encrypted_value = encrypt(value,password);
  return encrypted_value;
}


function get_encrypted_value(encrypted_value,password){
  var encrypted_master_password = getOptions().master_password_encrypted;
  if(!encrypted_master_password){
    if(debug)  console.log('NO encrypted_master_password')
    return false;
  }
  var master_password = decrypt(encrypted_master_password,password);
  if(!master_password){
    if(debug)  console.log('No master password');
    return false;
  }
  if(!check_correct_user_password(password)){
    if(debug)  console.log('No correct password')
    return false;
  }
  if(debug)  console.log('encrypted_value:'+encrypted_value+ '__master_password:'+master_password+'');
  var value = decrypt(encrypted_value,master_password);
  if(!value){
    if(debug)  console.log('NO VALUE');
    return false;
  }
  return value;
}






































  /************************************************************************************/
  /************************************************************************************/
  /*************************** FLOW Functions *****************************************/
  /************************************************************************************/
  /************************************************************************************/
  /************************************************************************************/





  function launchStartup(menuItem){
    if(!appLauncher) return;
    if(debug)  console.log('launching');
    if(debug)  console.log(menuItem);
    var checked = menuItem.checked;
    if(debug)  console.log('CHECKED: '+checked);
    if(checked){
      Options.launchStartup = true;
      appLauncher.enable()
    }else{
      Options.launchStartup = false;
      appLauncher.disable()
    }
    saveOptions();
  }

  function first_time(){
    createWindow(null,function(){
      // go to about
      mainWindow.webContents.send('go_to_section',"about")
    });
    if(debug) console.log('FIRST TIME');
  }


  function init(){
    //createWindow();
    //detect first time
    check_latest_version();
    storage.get('first_time_done',function(error, data){
      if(error || !data || (Object.keys(data).length===0 && data.constructor == Object)){
        first_time();
        storage.set('first_time_done',true,function(error){
        });
      }else{
        //  if(debug) console.log('Already started, not first time!');
      }
    })

    app_path = app.getAppPath();
    app_path = app_path.split(".app")[0]+'.app';
    if(debug)  console.log('app path'+app_path+'*');

    appLauncher = new AutoLaunch({
      name: app_title,
      path: app_path,
      isHidden:true
    });


    app.dock.hide()
    appIcon = new Tray(__dirname+'/img/'+icon+'.png');

    var checked_startup = false;
    /* // done after
    if(Options){  if(Options.launchStartup) checked_startup = true;}
    */

    contextMenu = Menu.buildFromTemplate([
      { label: 'Shortexts', type: 'normal',click:createWindow},
      /*
      { label: 'FastPaste', id:'submenu_shortexts',  submenu: [
      {
      label: 'Start',
      id: 'start',
    },
    {
    label: 'Stop',
    enabled:false
  },
  {
  label: 'Restart',
  enabled:false
}
]
},*/
{ label: '', type: 'separator'},
{ id:'OptionStartup',label: 'Run at startup', type: 'normal', type:'checkbox', checked: checked_startup, click:launchStartup },
//{ label: 'Save value', type: 'normal', role:'services' },
{ label: 'About', type: 'normal',/* role:'about',*/ click:function(){
  launch_about();
}},
{ label: 'Check updates', type: 'normal', click:function(){
  go_to_website();
}},
//{ label: 'Close', type: 'normal', role:'close' },
{ label: 'Quit', type: 'normal', click:quit }
]);
appIcon.setToolTip('This is my application.');
appIcon.setContextMenu(contextMenu);

readOptions(function(data){
  if(data.launchStartup){
    // check menu "run at startup"
    var items = contextMenu.items
    for(i=0;i<items.length;i++){
      if(items[i].id =='OptionStartup'){
        if(debug)  console.log("Seting optionstartup to true");
        items[i].checked = true;
      }
    }
  }

  getLocalStorage();
  control_key_encrypted = getOptions().password_control_key;
  global.control_key_encrypted = control_key_encrypted;
  password_set = getOptions().master_password_encrypted;
  if(!password_set) password_set = false;
  global.password_set = password_set;

});

//createWindow();

var ret2 = globalShortcut.register('CommandOrControl+Shift+L', function() {
  createWindow();
});


var ret = globalShortcut.register('CommandOrControl+L', function() {
  if(debug)  console.log('CommandOrControl+L is pressed');
  searchWindow();
});

if(debug)  console.log(globalShortcut.isRegistered('CommandOrControl+L'));// Check whether a shortcut is registered.
//createWindow();
}






function searchOver(){
  //  exec("osascript -e 'tell application \"System Events\" to keystroke \"v\" using {command down}'");
  //exec("ls",function(code, stdout, stderr) {
  app.hide();
  // now only for mac/darwin
  exec("osascript -e 'tell application \"System Events\" to keystroke \"v\" using {command down}' &",function(code, stdout, stderr) {
    if(debug){
      if(debug) console.log('Exit code:', code);
      if(debug) console.log('Program output:', stdout);
      if(debug) console.log('Program stderr:', stderr);
    }
    if((Options && Options.pressIntro) || press_intro){
      // press intro
      exec("osascript -e 'tell application \"System Events\" to key code 76 ' &",function(code, stdout, stderr) {
      });
    }
  });
}


function openDir(dir){
  exec(" open '"+dir+"'",function(code, stdout, stderr) {
    if(debug) console.log('CODE: '+code);
    if(debug) console.log('stdout: '+stdout);
    if(debug) console.log('stderr: '+stderr);
  });
}
function openUrl(url){
  exec(" open '"+url+"'",function(code, stdout, stderr) {
    if(debug) console.log('CODE: '+code);
    if(debug) console.log('stdout: '+stdout);
    if(debug) console.log('stderr: '+stderr);
  });
}


function copy_image(path){
  const nativeImage = require('electron').nativeImage;
  var image = nativeImage.createFromPath(path);
  if(!image) if(debug) console.log ('NOOO IMAGE');
  else clipboard.writeImage(image,"selection");
}



function paste_value(arg){
  if(debug)  console.log(arg);  // prints "ping"
  //event.sender.send('asynchronous-reply', 'pong');
  if(!arg){
    if(search_window){
      search_window.close();
      search_window=null;
    }
    return;
  }
  if(arg.indexOf('\n')!=-1 && arg.indexOf('\n') == arg.length-1){
    press_intro = true;
    arg = arg.substr(0,arg.indexOf('\n'));
  }else{
    press_intro = false;
  }
  //its a folder?
  if(arg.indexOf('/')!=-1 && arg.charAt(0)=='/'){
    //file from root
    if(fileExists(arg)){
      openDir(arg);
    }else if(pathExists.sync(arg)){
      openDir(arg);
      //its an image? ----> should we store as image and copy it?

    }else{
      if(debug) console.log('FILE Does not exist: '+arg);
    }
  }else if(arg.indexOf('http://')==0 || arg.indexOf('https://')==0){
    openUrl(arg);
  }else{
    clipboard.writeText(arg,"selection");
    searchOver()
  }
  //is it a url?

  if(search_window){
    search_window.close();
    search_window=null;
  }
  if(mainWindow){
    mainWindow.close();
    mainWindow=null;
  }
}

























/************************************************************************************/
/************************************************************************************/
/*************************** Options Functions **************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/





function readOptions(cb){
  storage.get("options", function(error, data){
    if(error || !data){
      if(error){
        if(debug)  console.log('Error reading storage:')
        if(debug)  console.log(error);
      }
      Options = {};
      Options.launchStartup = false;
      Options.searchByValue = true;
      Options.pressIntro = false;
      Options.emojis = true;
      saveOptions();
    }else{
      Options = data;
      if(!Options.launchStartup) Options.launchStartup = false;
      if(!Options.searchByValue) Options.searchByValue = true;
      if(!Options.pressIntro) Options.pressIntro = false;
      if(!Options.emojis) Options.emojis = false;
    }
    if(debug)  console.log('OPTIONS READED');
    if(debug)  console.log(Options);

    saveOptions();
    if(cb) cb(Options); /// its a callback
  })
}

function getOptions(){
  return Options;
}

function setOption(option, value){
  Options[option] = value;
  saveOptions();
}

function deleteOption(option){
  delete Options[option];
  saveOptions();
}

function saveOptions(){
  global.Options = Options;
  storage.set("options",Options,function(error){
    if(error) if(debug)  console.log('Error saving data');
    if(debug)  console.log('OPTIONS SAVED');


    if(mainWindow){
      mainWindow.webContents.send('optionsChanged',Options)
    }

  })
}



























/************************************************************************************/
/************************************************************************************/
/*************************** UI Functions *******************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/


function createWindow (send_value,cb_started) {
  // Create the browser window.
  if(mainWindow!=null){
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({width: 400, height: 800,frame: true, titleBarStyle: 'hidden',transparent: true })
  // and load the index.html of the app.
  //mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.loadURL('file://' + __dirname + '/index2.html');
  // Open the DevTools.
  if(debug)  mainWindow.webContents.openDevTools()
  //if(debug) console.log('sending: '+send_value);
  mainWindow.webContents.on('did-finish-load', () => {
    if(send_value!=null &&  typeof send_value == "string"){
      mainWindow.webContents.send('new_value',send_value)
    }
    if(cb_started && typeof cb_started == "function"){
      cb_started();
    }
    if(debug) console.log(' local vars ')
  });
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}



function searchWindow(){
  search_window = new BrowserWindow({ width: 500, height: 300, frame: false, titleBarStyle: 'hidden',transparent: true });
  if(debug) search_window.webContents.openDevTools()
  search_window.loadURL('file://' + __dirname + '/browser2.html')
  search_window.blur(function(){
    search_window.close();
    search_window = null;
  })
}




function launch_about(){

  createWindow(null,function(){
    // go to about
    mainWindow.webContents.send('go_to_section',"about")
  });
  return;
  //new window
  about_window = new BrowserWindow({ width: 500, height: 140, frame: true, titleBarStyle: 'hidden',transparent: false });
  //if(debug) update_window.webContents.openDevTools()
  about_window.loadURL('file://' + __dirname + '/about.html')
  about_window.blur(function(){
    about_window.close();
    about_window = null;
  })
  about_window.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    about_window = null
  })
}

function go_to_donation(){
  shell.openExternal(donation_url);
}
function go_to_website(){
  shell.openExternal(app_url);
}




function check_latest_version(){

  var request = require('request');
  request(app_url_version,function (error, response, body) {
    if (!error && response.statusCode == 200) {
      if(debug)  console.log("body request: "+body); // Show the HTML for the Google homepage.
      var parsed = JSON.parse(body);
      if(parsed){
        if(!parsed.version) return;
        if(debug)  console.log('VERSION SERVER:'+parsed.version);
        var server_version = parsed.version
        if(current_version!=server_version){
          /// new version available window
          update_window = new BrowserWindow({ width: 500, height: 140, frame: true, titleBarStyle: 'hidden',transparent: false });
          //if(debug) update_window.webContents.openDevTools()
          update_window.loadURL('file://' + __dirname + '/update.html')
          update_window.blur(function(){
            update_window.close();
            update_window = null;
          })
          update_window.on('closed', function () {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            update_window = null
          })
        }
      }
    }
  })

}




function promp_password_to_decrypt(value){
  get_value_to_decrypt = function(){
    return value;
  }
  ask_password_window = new BrowserWindow({width: 400, height: 800,frame: true, titleBarStyle: 'hidden',transparent: true })
  ask_password_window.loadURL('file://' + __dirname + '/ask_password.html');
}

function getLocalStorage(){
  if(dumbWindow!=null){
    dumbWindow.focus();
    return;
  }
  dumbWindow = new BrowserWindow({width: 0, height: 0,frame: true, titleBarStyle: 'hidden',transparent: true })
  dumbWindow.loadURL('file://' + __dirname + '/dumbWindow.html');
  dumbWindow.webContents.executeJavaScript(`
    require('electron').ipcRenderer.send('getLocalStorage', localStorage);
    `);
  }




function quit(){
  if (process.platform !== 'darwin') {
    app.quit();
  }else{
    //on mac
    app.quit();
  }
}



































/************************************************************************************/
/************************************************************************************/
/*************************** PASSWD Functions ***************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/





var password_master = "";

function check_correct_user_password(user_password){
  //not 100% correct if somebody changes
  control_key_encrypted = getOptions().password_control_key;
  if(decrypt(control_key_encrypted,user_password) == control_key) return true;
  //if(control_key_encrypted == encrypt(control_key,password))  return true;
  return false;
}



function change_password(current, new_user_password){
  if(debug) console.log("current " + "new_user_password");
  if(debug) console.log(current +" "+new_user_password);
  //setOption('master_password_encrypted',null); // force change
  var saved_encrypted_master_password = getOptions().master_password_encrypted;
  if(debug) console.log('saved_encrypted_master_password: '+saved_encrypted_master_password)
  var new_master_password ="";
  if(!saved_encrypted_master_password){
    new_master_password = create_master_password();
    if(debug) console.log('CREATING MASTER PASSWORD:::::'+new_master_password);
  }else if(saved_encrypted_master_password){
    // check we know the stored oned
    if(debug) console.log('saved_encrypted_master_password = '+saved_encrypted_master_password);
    var saved_master_password = decrypt(saved_encrypted_master_password,current);
    var password_control_key = decrypt(getOptions().password_control_key,current);
    if(debug) console.log('saved_master_password (DECRYPTED): '+ saved_master_password);
    if(saved_master_password){
      /*
      TODO: DECIDE IF WE CHANGE MASTER PASSWORD. If so decrypt all values NOW with "current master password"  and encrypt with "new_master_password"
      //new_master_password = create_master_password();
      for(i=0; i ....)
      // or maybe no change master password
      */
      if(debug) console.log('Changing pass from saved_master_password:'+saved_master_password);
      var saved_encrypted_master_password = encrypt(saved_master_password,new_user_password);
      if(debug) console.log('saved_encrypted_master_password: '+ saved_encrypted_master_password);
      setOption('master_password_encrypted',saved_encrypted_master_password);

      // control_key
      var new_password_control_key = encrypt(password_control_key,new_user_password);
      setOption('password_control_key',new_password_control_key);

      global.password_set = true; //getOptions().master_password_encrypted;
      new_user_password="";

      return true;
    }else{
      if(debug) console.log('saved_encrypted_master_password NOT OK' )
      return false;
    }
  }else{
    return false;
  }
  if(new_master_password){
    var password_control_key = encrypt(control_key,new_user_password);

    setOption('password_control_key',password_control_key);
    var new_encrypted_password = encrypt(new_master_password,new_user_password);
    new_user_password = ""; // detroy var
    setOption('master_password_encrypted',new_encrypted_password);
    global.password_set = true; //getOptions().master_password_encrypted;
    return true;
  }
}























/************************************************************************************/
/************************************************************************************/
/*************************** CRYPTO Functions ***************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/




function encrypt(value,key){
  key = CryptoJS.MD5(key);
  var iv = CryptoJS.lib.WordArray.create(64/8);
  var encrypted = CryptoJS.TripleDES.encrypt(value, key,{iv:iv});
  return encrypted.toString();
}
function decrypt(encrypted,key){
  var iv = CryptoJS.lib.WordArray.create(64/8);
  var enc_ct = {
    ciphertext: CryptoJS.enc.Base64.parse(encrypted)
  };
  key = CryptoJS.MD5(key);
  var decrypted = CryptoJS.TripleDES.decrypt(enc_ct, key,{iv:iv});
  if(!CryptoJS.enc.Utf8) return false;
  if(!decrypted) return false;
  try{
    return_ = decrypted.toString(CryptoJS.enc.Utf8);
    return  return_;
  }catch(e){
    if(debug) console.log('Exception '+e.toString());
    return false;
  }

}

function hash(value){
  return CryptoJS.MD5(value).toString();
}


function create_master_password(){
  var length = 20;
  var p = Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
  return p;
}




































/************************************************************************************/
/************************************************************************************/
/*************************** IPC bindings *******************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/



ipcMain.on('openDir', function(event, arg) {
  openDir(arg);
});
ipcMain.on('openFile', function(event, arg) {
  openDir(arg);
});

ipcMain.on('search-over-encrypted', function(event, arg) {
  if(debug)  console.log(arg);  // prints "ping"
  //event.sender.send('asynchronous-reply', 'pong');
  var password = arg.password;
  var val = arg.val;
  if(debug) console.log(arg);
  if(debug) console.log('PPPP: ');
  if(debug) console.log(password);
  // val is encrypted
  if(val.indexOf('\n')!=-1 && val.indexOf('\n') == val.length-1){
    press_intro = true;
    val = val.substr(0,val.indexOf('\n'));
  }else{
    press_intro = false;
  }

  var decrypted_value = get_encrypted_value(val,password);
  var val = decrypted_value;
  if(!val){
    clipboard.writeText("Password was not correct","selection");
  }else{
    clipboard.writeText(val,"selection");
  }
  if(search_window){
    search_window.close();
    search_window=null;
  }
  if(mainWindow){
    mainWindow.close();
    mainWindow=null;
  }
  searchOver();
});





ipcMain.on('eraseAllData',function(event,arg){
deleteOption('master_password_encrypted');
  storage.remove('first_time_done',function(){
    init();
  });
  if(mainWindow){
    mainWindow.close();
    mainWindow=null;
  }

});

ipcMain.on('changePassword',function(event,arg){
  var ret = {};
  if(control_key_encrypted && !arg.current_password){
    if(debug)  console.log('current password missing');
    ret.error = 'current password missing';
    mainWindow.webContents.send('passwordChanged',ret);
    return;
  }
  if(!arg.new_password){
    if(debug)  console.log('new password missing');
    ret.error = 'new password missing';
    mainWindow.webContents.send('passwordChanged',ret);
    return;
  }
  if(arg.new_password.length<3){
    if(debug)  console.log('new password too short');
    ret.error = 'new password too short';
    mainWindow.webContents.send('passwordChanged',ret);
    return;
  }

  var cp = arg.current_password;
  var np = arg.new_password;

  //ret.error

  var res = change_password(cp, np);
  if(!res){
    ret.error = 'Could not change password';
    mainWindow.webContents.send('error_from_main',ret)
    return false;
  }
  mainWindow.webContents.send('passwordChanged',ret);
});


ipcMain.on('decryptImportValuesWithPassword',function(event,arg){
  if(debug) console.log('decryptImportValuesWithPassword');
  if(debug) console.log(arg);
  var ret = {}
  if(!arg.values){
    ret.error = "No ValueS"
    if(debug)  console.log('ERROR NO VAL');
    mainWindow.webContents.send('error_from_main',ret)
    return false;
  }
  if(!arg.password){
    if(debug)  console.log('ERROR NO PASS');
    ret.error = "No Password"
    mainWindow.webContents.send('error_from_main',ret)
    return false;
  }
  var values = arg.values;
  var password_file = arg.password;
  //  var file_master_encrypted = arg.master_encrypted;
  var return_values = {};
  var dec_values = {}
  //if(debug) console.log('MASTER ENCRYPTED FILE: '+file_master_encrypted)
  /*  var decrypted_master_file = decrypt(file_master_encrypted,password_file);
  if(!decrypted_master_file){
  ret.error = "Could not recover Password for encrypted"+decrypted_master_file
  mainWindow.webContents.send('error_from_main',ret)
  return;
}*/

for(var i in values){
  var enc = values[i];
  if(enc.substr(0,4)=='ENC_') enc = enc.substr(4);
  //  if(debug) console.log('DECriptin: ' +enc+' ... with:' +decrypted_master_file);
  var decrypted_value = decrypt(enc,password_file);
  if(debug) console.log('DEC: ' +decrypted_value);
  if(!decrypted_value){
    ret.error = "No good Password"
    mainWindow.webContents.send('error_from_main',ret)
    return;
  }
  dec_values[i] = decrypted_value;
}
ret.decrypted_values = dec_values;
if(arg.callback){
  if(debug) console.log('calling '+arg.callback)
  mainWindow.webContents.send(arg.callback,ret)
}else{
  //    mainWindow.webContents.send('MultipleValuesReencrypted',ret)
}

});

ipcMain.on('decryptMultipleAndEncryptKey',function(event,arg){
  var ret = {};
  if(debug) console.log('decryptMultipleAndEncrypKey ARG:')
  if(debug) console.log(arg);
  if(debug) console.log('values');
  if(debug) console.log(arg.values);
  if(!arg.values){
    ret.error = "No Value"
    if(debug)  console.log('ERROR NO VAL');
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }
  if(!arg.password){
    if(debug)  console.log('ERROR NO PASS');
    ret.error = "No Password"
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }
  if(!getOptions().master_password_encrypted){
    ret.error = 'Before you encrypt, set a password in Preferences';
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }

  var values = arg.values;
  var password = arg.password;
  var return_values = {};
  for(var i in values){
    if(debug) console.log('Decrypting '+i + enc)
    var enc = values[i];
    if(enc.substr(0,4)=='ENC_') enc = enc.substr(4);
    var decrypted_value = get_encrypted_value(enc,password);
    if(!decrypted_value){
      if(debug) console.log('could not decrypt '+i);

      ret.error = 'Could not decrypt value: Password not correct 1';
      mainWindow.webContents.send('error_from_main',ret)
      return false;
    }
    var reencrypted_value = encrypt_value_without_master(decrypted_value,password);
    return_values[i] = reencrypted_value;
  }

  ret.reencrypted_values = return_values;
  ret.master_password_encrypted = getOptions().master_password_encrypted;
  if(debug) console.log('returnig reencrypted: ret');
  if(debug) console.log(ret);
  if(arg.callback){
    if(debug) console.log('calling '+arg.callback)
    mainWindow.webContents.send(arg.callback,ret)
  }else{

    mainWindow.webContents.send('MultipleValuesReencrypted',ret)
  }
});



ipcMain.on('decryptMultiple',function(event,arg){
  var ret = {};

  if(!arg.values){
    ret.error = "No Value"
    if(debug)  console.log('ERROR NO VAL');
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }
  if(!arg.password){
    if(debug)  console.log('ERROR NO PASS');
    ret.error = "No Password"
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }

  if(!getOptions().master_password_encrypted){
    ret.error = 'Before you encrypt, set a password in Preferences';
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }

  var values = arg.values;
  var password = arg.password;
  var return_values = [];
  for(var i in values){
    var decrypted_value = get_encrypted_value(values[i],password);
    if(!decrypted_value){
      ret.error = 'Could not decrypt value: Password not correct 2';
      mainWindow.webContents.send('valueDecrypted',ret)
      return false;
    }
    return_values[i] = decrypted_value;
  }
  ret.decrypted_values = return_values;
  ret.key = key;
  if(arg.callback){
    mainWindow.webContents.send(arg.callback,ret)
  }else{
    mainWindow.webContents.send('MultipleValuesDecrypted',ret)
  }


});


ipcMain.on('decryptValue',function(event,arg){

  var ret = {};
  if(!arg.key){
    ret.error = "No key";
    if(debug)  console.log('ERROR NO KEY');
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }
  if(!arg.value){
    ret.error = "No Value"
    if(debug)  console.log('ERROR NO VAL');
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }
  if(!arg.password){
    if(debug)  console.log('ERROR NO PASS');
    ret.error = "No Password"
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }

  if(!getOptions().master_password_encrypted){
    ret.error = 'Before you encrypt, set a password in Preferences';
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }

  var value = arg.value;
  var key = arg.key;
  var password = arg.password;
  var decrypted_value = get_encrypted_value(value,password);
  if(!decrypted_value){
    ret.error = 'Could not decrypt value: Password not correct!';
    mainWindow.webContents.send('valueDecrypted',ret)
    return false;
  }
  ret.decrypted_value = ret.value = decrypted_value;
  ret.key = key;

  mainWindow.webContents.send('valueDecrypted',ret)


})

ipcMain.on('encryptValue',function(event,arg){
  var ret = {};

  if(!arg.key){
    ret.error = "No key";
    if(debug)  console.log('ERROR NO KEY');
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }
  if(!arg.value){
    ret.error = "No Value"
    if(debug)  console.log('ERROR NO VAL');
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }
  if(!arg.password){
    if(debug)  console.log('ERROR NO PASS');
    ret.error = "No Password"
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }

  if(!getOptions().master_password_encrypted){
    ret.error = 'Before you encrypt, set a password in Preferences';
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }



  var value = arg.value;
  var key = arg.key;
  var password = arg.password;
  var encrypted_value = encrypt_value(value,password);

  if(!encrypted_value){
    ret.error = 'Could not encrypt value: Password not correct!';
    mainWindow.webContents.send('valueEncrypted',ret)
    return false;
  }
  ret.encrypted_value = encrypted_value;
  ret.key = key;
  ret.value = value;
  if(arg.callback){
    mainWindow.webContents.send(arg.callback,ret);
  }else{
    mainWindow.webContents.send('valueEncrypted',ret)
  }

});

ipcMain.on('getLocalStorage',function(event,arg){
  if(debug) console.log('Local Storage in Main');
  if(debug) console.log(arg);


  var shortexts_submenu =  [

  ];

  for(var i in arg){
    var v = arg[i];
    (function(val){
      shortexts_submenu.push({
        label:i,
        enable:true,
        click: function(){
          if(debug) console.log(val);
          if(val.substr(0,4)=='ENC_'){
            //its encrypted!!
            promp_password_to_decrypt(val.substr(4));
          }else{
            /*
            clipboard.writeText(val,"selection");
            searchOver()
            */
            paste_value(val);
          }

        }
      })
    })(v)
  }
  var submenu_id = "submenu_shortexts";
  var options  = { label: 'FastPaste', id:'submenu_shortexts',  submenu: shortexts_submenu
};
var menuItem = new MenuItem(options);
contextMenu.insert(1, menuItem);
//  Menu.setApplicationMenu(menu);
appIcon.setContextMenu(contextMenu)
});

ipcMain.on('goToWebsite', function(event, arg) {
  go_to_website();
});

ipcMain.on('goToDonation', function(event, arg) {
  go_to_donation();
});


ipcMain.on('setOption', function(event, arg) {
  if(debug)  console.log(arg);  // prints "ping"
  //event.sender.send('asynchronous-reply', 'pong');
  var o = arg.option;
  var v = arg.value;
  if(o=='launchStartup'){
    var items = contextMenu.items
    for(i=0;i<items.length;i++){
      if(debug)  console.log('Checking startup value');
      if(items[i].id =='OptionStartup') items[i].checked = v;
    }
  }
  setOption(o,v);
});

/*
ipcMain.on('getOptions', function(event, arg) {
if(debug)  console.log(arg);  // prints "ping"
});*/


ipcMain.on('get-password',function(event,password){
  if(debug)  console.log(arg);  // prints "ping"

  if(ask_password_window){
    ask_password_window.close();
  }
  var val = get_encrypted_value(get_value_to_decrypt(),password);
  if(!val) val= 'password was not correct';
  clipboard.writeText(val,"selection");
  searchOver()
})


// callbacks

ipcMain.on('search-over-new-value',function(event,arg){
  if(debug)  console.log(arg);  // prints "ping"
  var new_value = arg;
  if(search_window){
    search_window.close();
    search_window = null;
  }
  createWindow(new_value);

})

ipcMain.on('update',function(event,arg){
  go_to_website();
  if(update_window!=null){
    update_window.close();
    update_window = null;
  }
});

ipcMain.on('search-over', function(event, arg) {

  paste_value(arg);
});













/************************************************************************************/
/************************************************************************************/
/*************************** App bindings *******************************************/
/************************************************************************************/
/************************************************************************************/
/************************************************************************************/


app.on('ready', init)


app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


app.on('browser-window-blur', function () {
  if(search_window!=null && search_window instanceof BrowserWindow){
    search_window.close();
    search_window = null;
  }
  if(about_window!=null && about_window instanceof BrowserWindow){
    about_window.close();
    about_window = null;
  }
  if(update_window !=null && update_window instanceof BrowserWindow){
    update_window.close();
    update_window = null;
  }
  clipboard.readText("selection");
});

app.on('browser-window-focus', function () {
  //clipboard.readText("selection");
});


app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
  if (mainWindow == null) {
    createWindow()
  }
})
app.on('will-quit', function() {
  globalShortcut.unregister('CommandOrControl+L');
  globalShortcut.unregisterAll();
});
