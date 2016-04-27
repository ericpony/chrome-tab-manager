var Window = React.createFactory(React.createClass({
  render: function () {
    //console.log(this.props);
    var props = this.props;
    var hideWindow = true;
    var tabRowWidth = props.layout == "blocks" ? Math.ceil(Math.sqrt(props.tabs.length + 2)) : (props.layout == "vertical" ? 1 : 18);
    var tabs = props.tabs.map(function (tab) {
      var isHidden = !!props.hiddenTabs[tab.id];// && props.filterTabs;
      var isSelected = !!props.selection[tab.id];
      hideWindow &= isHidden;
      return Tab({
        tab: tab,
        layout: props.layout,
        onTop: props.isOnTop,
        selected: isSelected,
        hidden: isHidden,
        bookmark: props.toggleBookmark,
        select: props.select,
        drag: props.drag,
        drop: props.drop,
        ref: "tab" + tab.id
      });
    });
    if (!hideWindow) {
      //tabs.push(React.DOM.div({
      //    className: "icon add " + (this.props.layout == "blocks" ? "" : "window-action"),
      //    onClick: this.addTab
      //}));
      //tabs.push(React.DOM.div({
      //    className: "icon close " + (this.props.layout == "blocks" ? "" : "window-action"),
      //    onClick: this.close
      //}));
      var children = [];
      for (var j = 0; j < tabs.length; j++) {
        if (j && j % tabRowWidth == 0 && (j < tabs.length - 1 || this.props.layout == "blocks")) {
          children.push(React.DOM.div({className: "newline"}));
        }
        children.push(tabs[j]);
      }
      return React.DOM.div({className: "window " + (this.props.layout == "blocks" ? "block" : "")}, children);
    } else {
      return null;
    }
  },
  addTab: function () {
    chrome.tabs.create({windowId: this.props.tabs[0].windowId});
  },
  close: function () {
    chrome.windows.remove(this.props.tabs[0].windowId);
  }
}));
