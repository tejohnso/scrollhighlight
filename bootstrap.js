/*global Components, APP_SHUTDOWN */
"use strict";
var Cc = Components.classes, Ci = Components.interfaces;

function loadIntoWindow(window) {
  var i, tabs, doc, gb;
  if (!window.document.getElementById("tabbrowser-tabs")) { return; }
  gb = window.gBrowser;
  window.dump('shAddon: loading into window\n');

  gb.shAddon = {};
  gb.shAddon.shListener = shListener;
  gb.shAddon.shInit = shInit;
  gb.addEventListener("scroll", gb.shAddon.shListener, false);
  gb.addEventListener("load", gb.shAddon.shInit, true); //load doesn't bubble
  window.dump('shAddon: loaded into window\n');

  function shInit(e) {
    if (e.target.nodeName !== "#document") {return;}
    e.target.shAddon = {};
    e.target.shAddon.lastStableY = e.target.defaultView.pageYOffset;
  }

  function shListener(e) {
    var doc = e.target, win = doc.defaultView;
    doc.shAddon = (doc.shAddon || {});
    win.clearTimeout(doc.shAddon.removalTimeoutHandle);
    if (!doc.shAddon.shBar) {createBar(doc);}
    if (win.pageYOffset < doc.shAddon.lastStableY) { //going up
      if (doc.shAddon.lastY < win.pageYOffset) { //changed direction
        doc.shAddon.lastStableY = win.pageYOffset; //reset location
      } else if (doc.shAddon.lastStableY - win.innerHeight >
          win.pageYOffset) { // fast scrolle off the bottom
        doc.shAddon.lastStableY = win.pageYOffset; //reset location
      }
      doc.shAddon.shBar.style.top = doc.shAddon.lastStableY + 'px';
    } else { //going down
      if (doc.shAddon.lastY > win.pageYOffset) { //changed direction
        doc.shAddon.lastStableY = win.pageYOffset; //reset location
      } else if (doc.shAddon.lastStableY + win.innerHeight < 
          win.pageYOffset) { // fast scrolled off the top
        doc.shAddon.lastStableY = win.pageYOffset; //reset location
      }
      doc.shAddon.shBar.style.top =
        (doc.shAddon.lastStableY + win.innerHeight) + 'px';
    }
    doc.shAddon.removalTimeoutHandle = win.setTimeout(removeBar, 500);
    doc.shAddon.shBar.style.opacity = 1;
    doc.shAddon.lastY = win.pageYOffset;
    doc.body.appendChild(doc.shAddon.shBar);

    function removeBar() {
      var el = doc.getElementById('scrollHighlightBar');
      if (el) {fadeOut(el);}
      doc.shAddon.lastStableY = win.pageYOffset;
  
      function fadeOut(el) {
        if (el.style.opacity <= 0) {return;} 
        el.style.opacity = el.style.opacity - 0.05;
        win.setTimeout(function() {fadeOut(el);}, 10);
      }
    }

    function createBar(doc) {
      doc.shAddon.shBar = window.document.createElement('div');
      doc.shAddon.shBar.style.width = '100%';
      doc.shAddon.shBar.style.height = '3px';
      doc.shAddon.shBar.style.position = 'absolute';
      doc.shAddon.shBar.style.left = '0';
      doc.shAddon.shBar.style.backgroundColor = 'blue';
      doc.shAddon.shBar.id = 'scrollHighlightBar';
      doc.shAddon.shBar.style.opacity = 1;
      doc.shAddon.shBar.style.zIndex = 1000;
    }
  }
}

function unloadFromWindow(window) {
  var tabs, i, doc, gb;
  if (!window) {
    return;
  }
  gb = window.gBrowser;
  try{
  window.dump('shAddon: unloading\n');
  for (i = 0, tabs = gb.browsers.length; i < tabs; i += 1) {
    doc = gb.getBrowserAtIndex(i).contentDocument;
    if (doc.shAddon && doc.shAddon.removalTimeoutHandle) {
      doc.defaultView.clearTimeout(doc.shAddon.removalTimeoutHandle);
    }
    window.dump('shAddon: unloaded listener\n');
  }
  gb.removeEventListener("scroll", gb.shAddon.shListener);
  gb.removeEventListener("load", gb.shAddon.shInit);
  delete gb.shAddon;
  window.dump('shAddon: unloaded\n');
  }catch(e){window.dump(e);}
}

/*
 bootstrap.js API
*/

var windowListener = {
  onOpenWindow: function(aWindow) {
    var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
                    getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function loadHandler() {
      domWindow.removeEventListener("load", loadHandler, true);
      loadIntoWindow(domWindow);
    }, true);
  },
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { }
};

function startup(aData, aReason) {
  var wm, enumerator, win;
  wm = Cc["@mozilla.org/appshell/window-mediator;1"]
     .getService(Ci.nsIWindowMediator);
  enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
     win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow).top;
    loadIntoWindow(win);
  }

  wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  var wm, enumerator, win;
  if (aReason === APP_SHUTDOWN) {return;}

  wm = Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator);

  wm.removeListener(windowListener);

  enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
    win.dump('shAddon: unloading from window' + '\n');
    unloadFromWindow(win);
  }
}

function install(aData, aReason) { }

function uninstall(aData, aReason) {
  shutdown(aData, aReason);
}
