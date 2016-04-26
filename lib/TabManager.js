var TabManager = React.createFactory(React.createClass({
  getInitialState: function () {
    this.update();
    var bookmarks = {};
    var bookmarkList = localStorage["bookmarks"] || "";
    bookmarkList.split(",").forEach(function (b) {
      bookmarks[b] = true;
    });
    return {
      layout: localStorage["layout"] || "horizontal",
      windows: [],
      selection: {},
      hiddenTabs: {},
      tabsById: {},
      windowsById: {},
      bookmarks: bookmarks,
      filterTabs: !!localStorage["filter-tabs"]
    }
  },
  render: function () {
    var self = this;
    var hiddenCount = self.state.hiddenCount || 0;
    var tabCount = self.state.tabCount || 0;
    var tabsOnTop = [];
    var doDrag = self.drag.bind(self);
    var doDrop = self.drop.bind(self);
    var doSelect = self.select.bind(self);
    var doBookmark = self.toggleBookmark.bind(self);

    function WindowView (win, tabs, wid) {
      return Window({
        window: win,
        tabs: tabs,
        layout: self.state.layout,
        selection: self.state.selection,
        hiddenTabs: self.state.hiddenTabs,
        filterTabs: self.state.filterTabs,
        select: doSelect,
        toggleBookmark: doBookmark,
        drag: doDrag,
        drop: doDrop,
        ref: "window" + wid
      });
    }

    var windowViews = this.state.windows.map(function (window) {
      for (var i in window.tabs) {
        var tab = window.tabs[i];
        if (self.state.bookmarks[tab.id]) {
          tabsOnTop.push(tab);
        }
      }
      return WindowView(window, window.tabs, window.id);
    });
    if (tabsOnTop.length) {
      windowViews.unshift(WindowView(undefined, tabsOnTop, 0));
    }
    return React.DOM.div({},
      windowViews,
      React.DOM.div({className: "window search-box"},
        React.DOM.input({type: "text", onChange: this.search, onKeyDown: this.checkEnter, ref: "searchbox"}),
        React.DOM.div({
          className: "icon window-action " + this.state.layout,
          title: "Change layout",
          onClick: this.changeLayout
        }),
        React.DOM.div({className: "icon window-action trash", title: "Delete Tabs", onClick: this.deleteTabs}),
        React.DOM.div({className: "icon window-action pin", title: "Pin Tabs", onClick: this.pinTabs}),
        React.DOM.div({
          className: "icon window-action filter" + (this.state.filterTabs ? " enabled" : ""),
          title: (this.state.filterTabs ? "Do not hide" : "Hide") + " non-matching Tabs",
          onClick: this.toggleHidingNonMatched
        }),
        React.DOM.div({className: "icon window-action new", title: "Add Window", onClick: this.addWindow})
      ),
      React.DOM.div({className: "info-box"}, !hiddenCount ? "" : "(" + (tabCount - hiddenCount) + "/" + tabCount + ")"),
      React.DOM.div({className: "window placeholder"})
    )
  },
  componentDidMount: function () {
    var box = this.refs.searchbox.getDOMNode();
    box.value = localStorage["last-search"] || "";
    box.focus();
    box.select();

    chrome.windows.onCreated.addListener(this.update.bind(this));
    chrome.windows.onRemoved.addListener(this.update.bind(this));
    chrome.tabs.onCreated.addListener(this.update.bind(this));
    chrome.tabs.onUpdated.addListener(this.update.bind(this));
    chrome.tabs.onMoved.addListener(this.update.bind(this));
    chrome.tabs.onDetached.addListener(this.update.bind(this));
    chrome.tabs.onRemoved.addListener(this.update.bind(this));
    chrome.tabs.onReplaced.addListener(this.update.bind(this));
  },
  update: function () {
    chrome.windows.getAll({populate: true}, function (windows) {
      this.state.windows = windows;
      this.state.windowsById = {};
      this.state.tabsById = {};
      var tabCount = 0;
      for (var i = 0; i < windows.length; i++) {
        var window = windows[i];
        this.state.windowsById[window.id] = window;
        for (var j = 0; j < window.tabs.length; j++) {
          var tab = window.tabs[j];
          this.state.tabsById[tab.id] = tab;
          tabCount++;
        }
      }
      for (var id in this.state.selection) {
        if (!this.state.tabsById[id]) delete this.state.selection[id];
      }
      this.state.tabCount = tabCount;
      this.state.searchLen = 0;
      this.forceUpdate();

      this.search(this.refs.searchbox.getDOMNode().value);
    }.bind(this));
  },
  deleteTabs: function () {
    var self = this;
    var tabs = Object.keys(this.state.selection).map(function (id) {
      return self.state.tabsById[id]
    });
    if (tabs.length) {
      for (var i = 0; i < tabs.length; i++) {
        document.getElementById("t" + tabs[i].id).parentNode.classList.add("fade-out");
      }
      window.setTimeout(function () {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.remove(tabs[i].id);
        }
      }, 500);
    } else {
      chrome.windows.getCurrent(function (w) {
        chrome.tabs.getSelected(w.id, function (t) {
          chrome.tabs.remove(t.id);
        });
      });
    }
  },
  addWindow: function () {
    var self = this;
    var tabs = Object.keys(this.state.selection).map(function (id) {
      return self.state.tabsById[id]
    });
    var first = tabs.shift();
    if (first) {
      chrome.windows.create({tabId: first.id}, function (w) {
        chrome.tabs.update(first.id, {pinned: first.pinned});
        for (var i = 0; i < tabs.length; i++) {
          (function (tab) {
            chrome.tabs.move(tab.id, {windowId: w.id, index: 1}, function () {
              chrome.tabs.update(tab.id, {pinned: tab.pinned});
            });
          })(tabs[i]);
        }
      });
    } else {
      chrome.windows.create({});
    }
  },
  pinTabs: function () {
    var self = this;
    var tabs = Object.keys(this.state.selection).map(function (id) {
      return self.state.tabsById[id]
    }).sort(function (a, b) {
      return a.index - b.index
    });
    if (tabs.length) {
      if (tabs[0].pinned) tabs.reverse();
      for (var i = 0; i < tabs.length; i++) {
        chrome.tabs.update(tabs[i].id, {pinned: !tabs[0].pinned});
      }

    } else {
      chrome.windows.getCurrent(function (w) {
        chrome.tabs.getSelected(w.id, function (t) {
          chrome.tabs.update(t.id, {pinned: !t.pinned});
        });
      });
    }
  },
  search: function (e) {
    var searchString = typeof e == "string" ? e : (e.target.value || "");
    var searchLength = searchString.length;
    var hiddenCount = this.state.hiddenCount || 0;
    if (!searchLength) {
      this.state.selection = {};
      this.state.hiddenTabs = {};
      hiddenCount = 0;
    } else {
      var idList;
      var lastSearchLen = this.state.searchLen;
      if (!lastSearchLen) {
        idList = this.state.tabsById;
      } else if (lastSearchLen > searchLength) {
        idList = this.state.hiddenTabs;
      } else if (lastSearchLen < searchLength) {
        idList = this.state.selection;
      } else {
        return; // do nothing
      }
      for (var id in idList) {
        var tab = this.state.tabsById[id];
        if ((tab.title + " " + tab.url).toLowerCase().indexOf(searchString.toLowerCase()) >= 0) {
          hiddenCount -= (this.state.hiddenTabs[id] || 0);
          this.state.selection[id] = true;
          delete this.state.hiddenTabs[id];
        } else {
          hiddenCount += 1 - (this.state.hiddenTabs[id] || 0);
          this.state.hiddenTabs[id] = true;
          delete this.state.selection[id];
        }
      }
    }
    localStorage["last-search"] = searchString;
    this.state.hiddenCount = hiddenCount;
    this.state.searchLen = searchLength;
    this.forceUpdate();
  },
  checkEnter: function (e) {
    if (e.keyCode == 13) this.addWindow();
  },
  changeLayout: function () {
    if (this.state.layout == "blocks") {
      localStorage["layout"] = this.state.layout = "horizontal";
    } else if (this.state.layout == "horizontal") {
      localStorage["layout"] = this.state.layout = "vertical";
    } else {
      localStorage["layout"] = this.state.layout = "blocks";
    }
    this.forceUpdate();
  },
  toggleBookmark: function (id) {
    var bookmarks = this.state.bookmarks;
    if (bookmarks[id]) {
      delete bookmarks[id];
    } else {
      bookmarks[id] = true;
    }
    this.forceUpdate();
    var bookmarkList = [];
    for (var id in bookmarks) {
      if (bookmarks.hasOwnProperty(id)) {
        bookmarkList.push(id);
      }
    }
    if (bookmarkList.length) {
      localStorage["bookmarks"] = bookmarkList;
    }
  },
  select: function (id) {
    if (this.state.selection[id]) {
      delete this.state.selection[id];
    } else {
      this.state.selection[id] = true;
    }
    this.forceUpdate();
  },
  drag: function (e, id) {
    if (!this.state.selection[id]) {
      this.state.selection = {};
      this.state.selection[id] = true;
    }
    this.forceUpdate();
  },
  drop: function (id, before) {
    var self = this;
    var tab = this.state.tabsById[id];
    var tabs = Object.keys(this.state.selection).map(function (id) {
      return self.state.tabsById[id]
    });
    var index = tab.index + (before ? 0 : 1);

    for (var i = 0; i < tabs.length; i++) {
      (function (t) {
        chrome.tabs.move(t.id, {windowId: tab.windowId, index: index}, function () {
          chrome.tabs.update(t.id, {pinned: t.pinned});
        });
      })(tabs[i]);
    }
  },
  toggleHidingNonMatched: function () {
    this.state.filterTabs = !this.state.filterTabs;
    localStorage["filter-tabs"] = this.state.filterTabs ? 1 : ""
    this.forceUpdate();
  }
}));
