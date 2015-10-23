var Tab = React.createFactory(React.createClass({
    getInitialState: function () {
        return {};
    },
    render: function () {
        var children = [];
        if (this.props.layout == "vertical") {
            children.push(React.DOM.div({
                className: "close",
                id: "t" + this.props.tab.id,
                title: "Close thid Tab",
                onClick: this.closeTab
            }));
            children.push(React.DOM.div({
                className: "tabtitle",
                onMouseOver: this.toggleCloseBtn(true),
                onMouseLeave: this.toggleCloseBtn(false),
            }, this.props.tab.title))
        }
        return React.DOM.div({
                className: "icon tab "
                + (this.props.selected ? "selected " : "")
                + (this.props.hidden ? "hidden " : "")
                + (this.props.layout == "vertical" ? "full " : "")
                + (this.props.tab.incognito ? "incognito " : "")
                + (this.state.draggingOver || ""),
                style: {
                    backgroundImage: this.resolveFavIconUrl(),
                    paddingLeft: this.props.layout == "vertical" ? "20px" : ""
                },
                title: this.props.tab.title,
                onClick: this.select,
                onMouseOver: this.toggleCloseBtn(true),
                onMouseLeave: this.toggleCloseBtn(false),
                onDragStart: this.dragStart,
                onDragOver: this.dragOver,
                onDragLeave: this.dragOut,
                onDrop: this.drop,
                draggable: "true"
            },
            children,
            React.DOM.div({className: "limiter"})
        );
    },
    select: function (e) {
        if (e.cancelBubble) return;
        if (e.nativeEvent.shiftKey || e.nativeEvent.ctrlKey) {
            this.props.select(this.props.tab.id);
        } else {
            chrome.tabs.update(this.props.tab.id, {selected: true});
            chrome.windows.update(this.props.window.id, {focused: true});
        }
    },
    dragStart: function (e) {
        this.props.drag(e, this.props.tab.id);
    },
    dragOver: function (e) {
        e.nativeEvent.preventDefault();
        var before = this.state.draggingOver;
        if (this.props.layout == "vertical") {
            this.state.draggingOver = e.nativeEvent.offsetY > this.getDOMNode().clientHeight / 2 ? "bottom" : "top";
        } else {
            this.state.draggingOver = e.nativeEvent.offsetX > this.getDOMNode().clientWidth / 2 ? "right" : "left";
        }
        if (before != this.state.draggingOver) this.forceUpdate();
    },
    dragOut: function () {
        console.log("out");
        delete this.state.draggingOver;
        this.forceUpdate();
    },
    drop: function (e) {
        var before = this.state.draggingOver == "top" || this.state.draggingOver == "left";
        delete this.state.draggingOver;
        this.props.drop(this.props.tab.id, before);
    },
    toggleCloseBtn: function (mode) {
        return function (e) {
            var tab = e.target.classList[0] == "icon" ? e.target : e.target.parentNode;
            var btn = tab.firstChild;
            if (btn.classList[0] != "close") return;
            btn.style.display = "block";
            btn.className = "close" + (mode ? "" : " fade-out");
        }
    },
    closeTab: function (e) {
        e.stopPropagation();
        e.cancelBubble = true;
        var tab = e.target.parentNode;
        var tid = +e.target.id.substr(1);
        tab.classList.add("fade-out");
        window.setTimeout(function () {
            chrome.tabs.remove(tid);
            tab.style.display = "none";
        }, 500);
    },
    resolveFavIconUrl: function () {
        if (this.props.tab.url.indexOf("chrome://") !== 0) {
            return this.props.tab.favIconUrl ? ("url(" + this.props.tab.favIconUrl + ")") : "";
        } else {
            var favIcons = ["bookmarks", "chrome", "crashes", "downloads", "extensions", "flags", "history", "settings"];
            var iconName = this.props.tab.url.slice(9).match(/^\w+/g);
            return (!iconName || favIcons.indexOf(iconName[0]) < 0) ? "" : ("url(../images/chrome/" + iconName[0] + ".png)");
        }
    }
}));
