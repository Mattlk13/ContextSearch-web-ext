var userOptions;
var focusSearchBar = true;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	
	if ( message.userOptions ) userOptions = message.userOptions;

	if (typeof message.action !== 'undefined') {
		switch (message.action) {
			case "updateQuickMenuObject":
				quickMenuObject = message.quickMenuObject;
				
				// quickMenuObject can update before userOptions. Grab the lastUsed
				userOptions.lastUsedId = quickMenuObject.lastUsed || userOptions.lastUsedId;
				
				// send event to OpenAsLink tile to enable/disable
				document.dispatchEvent(new CustomEvent('updatesearchterms'));
				break;
		}
	}
});

function getSelectedText(el) {
	return el.value.substring(el.selectionStart, el.selectionEnd);
}

browser.runtime.sendMessage({action: "getUserOptions"}).then( async message => {
	userOptions = message.userOptions;
	
	let msg = await browser.runtime.sendMessage({action: "getUserOptions"});
	
	userOptions = msg.userOptions;
		
	makeSearchBar();

	let singleColumn = window == top ? userOptions.searchBarUseOldStyle : userOptions.sideBar.singleColumn;

	await setTheme();
	await setUserStyles();
	await makeQuickMenu({type: window == top ? "searchbar" : "sidebar", singleColumn: singleColumn})
		.then( qme => {
			document.body.appendChild(qme);
			
			if ( userOptions.quickMenuToolsPosition === 'bottom' && userOptions.quickMenuToolsAsToolbar )	
				document.body.appendChild(toolBar);
		});

	let sideBarOpenedOnSearchResults = await browser.runtime.sendMessage({action: 'sideBarOpenedOnSearchResults'});
	if ( sideBarOpenedOnSearchResults.shift() ) focusSearchBar = false;

	document.dispatchEvent(new CustomEvent('quickMenuIframeLoaded'));

});

document.addEventListener('quickMenuIframeLoaded', () => {

	// combined with inline body style prevents glitching when opening menu
	document.body.style.display = 'block';
		
	// focus the searchbar on open
	if ( focusSearchBar ) sb.focus();

	// trigger resize for sidebar. Resize triggers on load in the browser_action
	resizeMenu();
	
	// replace text with selection
	(async () => {
		let results = await browser.runtime.sendMessage({action: "getSelectedText"});
		let text = results.shift();
	
		if ( text ) sb.value = text;

		if ( focusSearchBar ) sb.select();
	})();

});

function toolsHandler() {
	
	if ( !qm ) return;
	
	if ( ! userOptions.quickMenuToolsAsToolbar && qm.rootNode.parent ) return; // has parent = subfolder
	
	qm.toolsArray.forEach( tool => tool.classList.remove('singleColumn'));
	
	let position = userOptions.quickMenuToolsPosition;
	
	// set tools position
	if ( userOptions.quickMenuToolsAsToolbar && position !== 'hidden' )
		createToolsBar(qm);
	
	if ( !userOptions.quickMenuToolsAsToolbar ) {
		if ( position === "top")
			qm.toolsArray.forEach( (tool, index) => qm.insertBefore(tool, qm.children.item(index)));
		else if ( position === "bottom" )
			qm.toolsArray.forEach( (tool, index) => qm.appendChild( tool ));
	}

	qm.toolsArray.forEach( tool => {
		if ( qm.singleColumn && !userOptions.quickMenuToolsAsToolbar ) tool.classList.add('singleColumn');
	});

//	qm.insertBreaks();
}

function toolBarResize(options) {

	options = options || {}

	if ( window != top ) return;

	let minWidth = 200;
	let maxHeight = 600;
	let maxWidth = 800;

	let tileSize = qm.getTileSize();

	qm.style.minWidth = 'initial';
	qm.style.height = null;

	// ignore width resizing if only opening suggestions ( prevents flashing )
	if ( !options.suggestionsResize && !options.groupMore && !options.groupLess ) {
		sg.style.width = 0;
		qm.style.width = null;
		toolBar.style.width = 0;
		tb.style.width = 0;
		qm.style.overflowX = null;
	
	//	qm.insertBreaks(); // this is usually handled in the toolsHandler, but currently the toolbar does not use that method
	}
	
	// set min width for singleColumn
	if ( qm.singleColumn ) minWidth = tileSize.width;

	// minimum toolbar width for Chrome ( Firefox min = 200 )
	document.body.style.minWidth = minWidth + "px";

	runAtTransitionEnd(document.documentElement, ["width", "height"], () => {

		if ( window.innerHeight < document.documentElement.scrollHeight ) {

			let sumHeight = getAllOtherHeights();
			qm.style.height = sumHeight + qm.scrollHeight > maxHeight ? maxHeight - sumHeight + "px": null;
		} 

		let minWindowWidth = Math.max(minWidth, window.innerWidth);

		if ( !qm.singleColumn && qm.scrollWidth <= window.innerWidth && qm.columns * tileSize.width <= document.documentElement.scrollWidth ) {

			let maxWidth = 800;

			qm.style.width = Math.max( minWindowWidth, Math.min(maxWidth, document.documentElement.scrollWidth ) ) + "px";

			// pad for scrollbars
			qm.style.paddingRight = qm.offsetWidth - qm.clientWidth + "px";

			let padding = tileSize.width - tileSize.rectWidth;

			let div_width = 'calc(' + 100 / qm.columns + "% - " + padding + "px)";

			qm.querySelectorAll('.tile:not(.singleColumn)').forEach( div => {
				div.style.width = div_width;
			});

		} else if ( qm.scrollWidth <= window.innerWidth ) {
		} else {
			qm.style.overflowX = 'scroll';
			qm.style.width = '100%';
		}

		document.dispatchEvent(new CustomEvent('resizeDone'));
				
	}, 50);

	window.addEventListener('resize', e => {
		toolBar.style.width = document.body.offsetWidth + "px";
		sg.style.width = document.body.offsetWidth + "px";
		tb.style.width = document.body.offsetWidth - 20 + "px";

	});
}

var docked = false;

function minifySideBar() {
	document.body.classList.toggle('mini');
	setTimeout(sideBarResize, 500);
}
function unminifySideBar() {
	document.body.classList.remove('mini');
	sideBarResize();
}

function sideBarResize(options) {
	
	options = options || {};

	if ( window == top ) return;

	qm.insertBreaks();

	// simple resize when mini
	if ( document.body.classList.contains('mini') ) {
		return window.parent.postMessage({
			action:"resizeSideBarIframe", 
			size: {width: sbc.getBoundingClientRect().width, height: sbc.getBoundingClientRect().height + mb.getBoundingClientRect().height}, 
			singleColumn: qm.singleColumn,
			tileSize: qm.getTileSize()
		}, "*");
	}
	
	// throwing sidebar errors
	if ( !qm ) return;

	let qm_height = qm.style.height;
	
	let iframeHeight = options.iframeHeight || ( !docked ? userOptions.sideBar.height : 10000 );
	
	document.body.style.height = docked ? "100vh" : document.body.style.height;
	
	qm.style.height = null;
	qm.style.width = null;
	sg.style.width = null;

	let allOtherElsHeight = getAllOtherHeights();

	qm.style.height = function() {
		
		if ( docked ) return `calc(100% - ${allOtherElsHeight}px)`;

		if ( options.suggestionsResize ) return qm_height;
				
		// if ( options.groupMore ) return qm.getBoundingClientRect().height + "px";
		
		return Math.min(iframeHeight - allOtherElsHeight, qm.getBoundingClientRect().height) + "px";
	}();

	// account for scrollbars
	let scrollbarWidth = qm.offsetWidth - qm.clientWidth + 1; // account for fractions

	qm.style.width = qm.getBoundingClientRect().width + scrollbarWidth + "px";
	toolBar.style.width = qm.style.width;

	qm.removeBreaks();

	window.parent.postMessage({
		action:"resizeSideBarIframe", 
		size: {width: qm.getBoundingClientRect().width, height: document.body.offsetHeight}, 
		singleColumn: qm.singleColumn,
		tileSize: qm.getTileSize()
	}, "*");
}

function resizeMenu(o) {
	
	if (!qm) return;
	// store scroll position
	let scrollTop = qm.scrollTop;
	let sgScrollTop = sg.scrollTop;
	
	qm.setDisplay();

	document.addEventListener('resizeDone', e => {
		qm.scrollTop = scrollTop;
		sg.scrollTop = sgScrollTop;
	});

	toolBarResize(o);
	sideBarResize(o);
	
	qm.scrollTop = scrollTop;
	sg.scrollTop = sgScrollTop;
}

function closeMenuRequest() {
	if ( window == top ) {
		if ( userOptions.searchBarCloseAfterSearch ) window.close();
	} else if ( userOptions.sideBar.closeAfterSearch ) {
		window.parent.postMessage({action: "closeSideBarRequest"}, "*");
	}
}

window.addEventListener('message', e => {

	switch (e.data.action) {
		case "sideBarResize":
			if ( e.data.docked !== undefined ) docked = e.data.docked;
			resizeMenu({iframeHeight: e.data.iframeHeight});
			break;
		
		case "quickMenuIframeLoaded":
			document.dispatchEvent(new CustomEvent('quickMenuIframeLoaded'));
			break;
			
		case "sideBarRebuild":
			qm.columns = e.data.columns;

			toolsHandler();
			
			qm.style.height = null;
			qm.style.width = null;

			// reset the minWidth for the tilemenu
			qm.setMinWidth();
			
			let rect = document.body.getBoundingClientRect();
			let rect_qm = qm.getBoundingClientRect();

			// send size to parent window for sidebar widget
			window.parent.postMessage({
				action:"resizeSideBarIframe", 
				size: {width: rect_qm.width, height: rect.height}, 
				tileSize: qm.getTileSize(), 
				singleColumn: qm.singleColumn
			}, "*");
			
			break;

		case "minifySideBar":
			minifySideBar();
			break;
	}
});

document.getElementById('closeButton').addEventListener('click', e => {

	if ( window != top )
		window.parent.postMessage({action: "closeSideBar"}, "*");
	else
		window.close();
});

addChildDockingListeners(mb, "sideBar");

if ( window == top ) {
	document.getElementById('minimizeButton').style.display = "none";
}

document.getElementById('minimizeButton').addEventListener('click', e => {
	window.parent.postMessage({action: "minimizeSideBarRequest"}, "*");
});

document.addEventListener('keydown', e => {
	if ( e.key === 'Escape' ) {
		if ( window != top)
			window.parent.postMessage({action: "minimizeSideBarRequest"}, "*");
	}
});
