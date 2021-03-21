window.browser = (function () {
  return window.msBrowser ||
    window.browser ||
    window.chrome;
})();

// not jQuery 
var $ = s => {
	return document.querySelector(s);
}

// array for storage.local
var userOptions = {};

// Browse button for manual import
$("#selectMozlz4FileButton").addEventListener('change', ev => {
	
	let searchEngines = [];
	let file = ev.target.files[0];
	
	if ( $('#cb_overwriteOnImport').checked && confirm("This will delete all custom search engines, folders, bookmarklets, separators, etc. Are you sure?") ) {
		userOptions.nodeTree.children = [];
		userOptions.searchEngines = [];
	}
	
	readMozlz4File(file, text => { // on success

		// parse the mozlz4 JSON into an object
		var engines = JSON.parse(text).engines;	
		searchEngines = searchJsonObjectToArray(engines);

		$('#status_div').style.display='inline-block';
		statusMessage({
			img: browser.runtime.getURL("icons/spinner.svg"),
			msg: browser.i18n.getMessage("LoadingRemoteContent"),
			color: "transparent",
			invert: false
		});

		let newEngines = [];
		
		for (let se of searchEngines) {
			
			if (!userOptions.searchEngines.find( _se => _se.title === se.title)) {
				console.log(se.title + " not included in userOptions.searchEngines");
				
				// add to searchEngines
				newEngines.push(se);
				
				let node = {
					type: "searchEngine",
					title: se.title,
					id: se.id,
					hidden: se.hidden || false
				}

				// replace one-click nodes with same name
				let ocn = findNodes(userOptions.nodeTree, (_node, parent) => {
					if ( _node.type === 'oneClickSearchEngine' && _node.title === se.title ) {
						parent.children.splice(parent.children.indexOf(_node), 1, node);
						return true;
					}
					return false;
				});
				
				if ( ocn.length ) {
					console.log(se.title + " one-click engine found. Replacing node");
				} else {
					// add to nodeTree
					userOptions.nodeTree.children.push(node);
				}
				
			}
		}
		// end 1.3.2+
		
		// get remote icons for new engines
		loadRemoteIcon({
			searchEngines: newEngines, // 1.3.2+
		}).then( (details) => {
			
			// append the new engines
			userOptions.searchEngines = userOptions.searchEngines.concat(details.searchEngines);
			saveOptions();
			
			if (details.hasFailedCount) {
				statusMessage({
					img: "icons/alert.svg",
					msg: browser.i18n.getMessage("LoadingRemoteContentFail").replace("%1", details.hasFailedCount),
					color: "transparent",
					invert: false
				});
			} else if (details.hasTimedOut) {
				statusMessage({
					img: "icons/alert.svg",
					msg: browser.i18n.getMessage("LoadingRemoteContentTimeout"),
					color: "transparent",
					invert: false
				});
			} else {
				statusMessage({
					img: "icons/checkmark.svg",
					msg: browser.i18n.getMessage("ImportedEngines").replace("%1", searchEngines.length).replace("%2", details.searchEngines.length),
					color: "#41ad49",
					invert: true
				});
			}

			buildSearchEngineContainer();
		});

	}, function() { // on fail

		// print status message to Options page
		statusMessage({
			img: "icons/crossmark.svg",
			msg: browser.i18n.getMessage("FailedToLoad"),
			color: "red",
			invert: true
		});
	});

});

function statusMessage(status) {				
	$('#status_img').src = status.img || "";
	$('#status').innerText = status.msg || "";
	
	let img = $('#status_img');
	
	img.parentNode.style.backgroundColor = status.color;
	img.style.filter = status.invert ? 'invert(1)' : 'none';
	img.style.height = "20px";

}

function restoreOptions() {

	function onGot(result) {

		userOptions = result.userOptions || {};

		$('#cb_quickMenu').checked = userOptions.quickMenu;	
		$('#n_quickMenuColumns').value = userOptions.quickMenuColumns;
		$('#n_quickMenuRows').value = userOptions.quickMenuRows;
		$('#n_quickMenuRowsSingleColumn').value = userOptions.quickMenuRowsSingleColumn;
		
		$('#b_quickMenuKey').value = userOptions.quickMenuKey;
		$('#b_quickMenuKey').innerText = keyCodeToString(userOptions.quickMenuKey) || browser.i18n.getMessage('ClickToSet');
		
		$('#b_contextMenuKey').value = userOptions.contextMenuKey;	
		$('#b_contextMenuKey').innerText = keyCodeToString(userOptions.contextMenuKey) || browser.i18n.getMessage('ClickToSet');
		$('#s_contextMenuSearchLinksAs').value = userOptions.contextMenuSearchLinksAs;
		$('#cb_contextMenuOnLinks').checked = userOptions.contextMenuOnLinks;
		$('#cb_contextMenuOnImages').checked = userOptions.contextMenuOnImages;
		
		$('#r_quickMenuOnKey').checked = userOptions.quickMenuOnKey;
				
		$('#cb_quickMenuOnMouse').checked = userOptions.quickMenuOnMouse;
		$('#s_quickMenuOnMouseMethod').value = userOptions.quickMenuOnMouseMethod;
		$('#cb_quickMenuSearchOnMouseUp').checked = userOptions.quickMenuSearchOnMouseUp;
		$('#r_quickMenuAuto').checked = userOptions.quickMenuAuto;
		$('#cb_quickMenuAutoOnInputs').checked = userOptions.quickMenuAutoOnInputs;
		$('#cb_quickMenuOnLinks').checked = userOptions.quickMenuOnLinks;
		$('#cb_quickMenuOnImages').checked = userOptions.quickMenuOnImages;
		$('#cb_quickMenuCloseOnScroll').checked = userOptions.quickMenuCloseOnScroll;
		$('#cb_quickMenuCloseOnClick').checked = userOptions.quickMenuCloseOnClick;
		$('#s_quickMenuToolsPosition').value = userOptions.quickMenuToolsPosition;
		$('#cb_quickMenuToolsAsToolbar').checked = userOptions.quickMenuToolsAsToolbar;
		$('#s_quickMenuSearchBar').value = userOptions.quickMenuSearchBar;
		$('#cb_quickMenuSearchBarFocus').checked = userOptions.quickMenuSearchBarFocus;
		$('#cb_quickMenuSearchBarSelect').checked = userOptions.quickMenuSearchBarSelect;
		$('#range_quickMenuScale').value = userOptions.quickMenuScale;
		$('#range_quickMenuIconScale').value = userOptions.quickMenuIconScale;
		// $('#i_quickMenuScale').value = (parseFloat(userOptions.quickMenuScale) * 100).toFixed(0) + "%";
		// $('#i_quickMenuIconScale').value = (parseFloat(userOptions.quickMenuIconScale) * 100).toFixed(0) + "%";
		$('#n_quickMenuOffsetX').value = userOptions.quickMenuOffset.x;
		$('#n_quickMenuOffsetY').value = userOptions.quickMenuOffset.y;
		
		$('#cb_quickMenuOnSimpleClick').checked = userOptions.quickMenuOnSimpleClick.enabled;
		$('#s_quickMenuOnSimpleClickButton').value = userOptions.quickMenuOnSimpleClick.button.toString();
		$('#cb_quickMenuOnSimpleClickAlt').checked = userOptions.quickMenuOnSimpleClick.alt;
		$('#cb_quickMenuOnSimpleClickCtrl').checked = userOptions.quickMenuOnSimpleClick.ctrl;
		$('#cb_quickMenuOnSimpleClickShift').checked = userOptions.quickMenuOnSimpleClick.shift;
		$('#cb_quickMenuSimpleClickUseInnerText').checked = userOptions.quickMenuOnSimpleClick.useInnerText;
		$('#cb_quickMenuOnDrag').checked = userOptions.quickMenuOnDrag;
		
		$('#s_quickMenuMouseButton').value = userOptions.quickMenuMouseButton.toString();
		$('#cb_contextMenu').checked = userOptions.contextMenu;
		$('#h_position').value = userOptions.quickMenuPosition;

		for (let p of document.getElementsByClassName('position')) {
			p.classList.remove('active')
			if (p.dataset.position === userOptions.quickMenuPosition)
				p.classList.add('active');
		}
				
		$('#s_contextMenuClick').value = userOptions.contextMenuClick;
		$('#s_contextMenuMiddleClick').value = userOptions.contextMenuMiddleClick;
		$('#s_contextMenuRightClick').value = userOptions.contextMenuRightClick;
		$('#s_contextMenuShift').value = userOptions.contextMenuShift;
		$('#s_contextMenuCtrl').value = userOptions.contextMenuCtrl;
		
		$('#cb_contextMenuShowAddCustomSearch').checked = userOptions.contextMenuShowAddCustomSearch;
		$('#cb_contextMenuShowRecentlyUsed').checked = userOptions.contextMenuShowRecentlyUsed;
		$('#cb_contextMenuShowRecentlyUsedAsFolder').checked = userOptions.contextMenuShowRecentlyUsedAsFolder;
		$('#n_contextMenuRecentlyUsedLength').value = userOptions.recentlyUsedListLength;
		$('#cb_contextMenuShowFolderSearch').checked = userOptions.contextMenuShowFolderSearch;
		
		$('#s_quickMenuLeftClick').value = userOptions.quickMenuLeftClick;
		$('#s_quickMenuRightClick').value = userOptions.quickMenuRightClick;
		$('#s_quickMenuMiddleClick').value = userOptions.quickMenuMiddleClick;
		$('#s_quickMenuShift').value = userOptions.quickMenuShift;
		$('#s_quickMenuCtrl').value = userOptions.quickMenuCtrl;
		$('#s_quickMenuAlt').value = userOptions.quickMenuAlt;
		
		$('#s_quickMenuFolderLeftClick').value = userOptions.quickMenuFolderLeftClick;
		$('#s_quickMenuFolderRightClick').value = userOptions.quickMenuFolderRightClick;
		$('#s_quickMenuFolderMiddleClick').value = userOptions.quickMenuFolderMiddleClick;
		$('#s_quickMenuFolderShift').value = userOptions.quickMenuFolderShift;
		$('#s_quickMenuFolderCtrl').value = userOptions.quickMenuFolderCtrl;
		$('#s_quickMenuFolderAlt').value = userOptions.quickMenuFolderAlt;
		$('#s_quickMenuSearchHotkeys').value = userOptions.quickMenuSearchHotkeys;
		$('#s_quickMenuSearchHotkeysFolders').value = userOptions.quickMenuSearchHotkeysFolders;
		
		$('#n_quickMenuAutoMaxChars').value = userOptions.quickMenuAutoMaxChars;
		$('#n_quickMenuOpeningOpacity').value = userOptions.quickMenuOpeningOpacity;
		$('#n_quickMenuAutoTimeout').value = userOptions.quickMenuAutoTimeout;
		$('#cb_quickMenuAllowContextMenu').checked = !userOptions.quickMenuAllowContextMenu;

		$('#cb_searchBarSuggestions').checked = userOptions.searchBarSuggestions;
		$('#cb_searchBarEnableHistory').checked = userOptions.searchBarEnableHistory;
		$('#cb_searchBarDisplayLastSearch').checked = userOptions.searchBarDisplayLastSearch;
		$('#s_searchBarDefaultView').value = userOptions.searchBarUseOldStyle ? "text" : "grid";
		$('#cb_searchBarCloseAfterSearch').checked = userOptions.searchBarCloseAfterSearch;
		$('#s_quickMenuDefaultView').value = userOptions.quickMenuUseOldStyle ? "text" : "grid";
		$('#n_searchBarColumns').value = userOptions.searchBarColumns;
		
		$('#n_sideBarColumns').value = userOptions.sideBar.columns;
		$('#s_sideBarDefaultView').checked = userOptions.sideBar.singleColumn ? "text" : "grid";
		$('#s_sideBarWidgetPosition').value = userOptions.sideBar.widget.position;
		$('#cb_sideBarWidgetEnable').checked = userOptions.sideBar.widget.enabled;
		$('#cb_sideBarStartOpen').checked = userOptions.sideBar.startOpen;
		$('#cb_sideBarCloseAfterSearch').checked = userOptions.sideBar.closeAfterSearch;
		$('#range_sideBarScale').value = userOptions.sideBar.scale;
		// $('#i_sideBarScale').value = (parseFloat(userOptions.sideBar.scale) * 100).toFixed(0) + "%";
		
		$('#t_userStyles').value = userOptions.userStyles;
		$('#cb_userStylesEnabled').checked = userOptions.userStylesEnabled;
		$('#t_userStyles').disabled = !userOptions.userStylesEnabled;
		$('#cb_enableAnimations').checked = userOptions.enableAnimations;
		$('#s_quickMenuTheme').value = userOptions.quickMenuTheme;
		
		$('#cb_highLightEnabled').checked = userOptions.highLight.enabled;
		$('#cb_highLightFollowDomain').checked = userOptions.highLight.followDomain;
		$('#cb_highLightFollowExternalLinks').checked = userOptions.highLight.followExternalLinks;
		
		$('#s_highLightStyle').value = userOptions.highLight.highlightStyle;
		
		$('#c_highLightColor0').value = userOptions.highLight.styles[0].color;
		$('#c_highLightBackground0').value = userOptions.highLight.styles[0].background;
		$('#c_highLightColor1').value = userOptions.highLight.styles[1].color;
		$('#c_highLightBackground1').value = userOptions.highLight.styles[1].background;
		$('#c_highLightColor2').value = userOptions.highLight.styles[2].color;
		$('#c_highLightBackground2').value = userOptions.highLight.styles[2].background;
		$('#c_highLightColor3').value = userOptions.highLight.styles[3].color;
		$('#c_highLightBackground3').value = userOptions.highLight.styles[3].background;
		$('#c_highLightColorActive').value = userOptions.highLight.activeStyle.color;
		$('#c_highLightBackgroundActive').value = userOptions.highLight.activeStyle.background;
		$('#s_highLightOpacity').value = userOptions.highLight.opacity;
		
		$('#cb_highLightFlashSelected').checked = userOptions.highLight.flashSelected;

		$('#cb_highLightNavBarEnabled').checked = userOptions.highLight.navBar.enabled;
		$('#cb_highLightShowFindBar').checked = userOptions.highLight.showFindBar;
		
		$('#cb_highLightMarkOptionsSeparateWordSearch').checked = userOptions.highLight.markOptions.separateWordSearch;
		$('#cb_highLightMarkOptionsIgnorePunctuation').checked = userOptions.highLight.markOptions.ignorePunctuation;
		$('#cb_highLightMarkOptionsCaseSensitive').checked = userOptions.highLight.markOptions.caseSensitive;
		$('#s_highLightMarkOptionsAccuracy').value = userOptions.highLight.markOptions.accuracy;
		$('#n_highLightMarkOptionsLimit').value = userOptions.highLight.markOptions.limit;

		$('#cb_findBarMarkOptionsSeparateWordSearch').checked = userOptions.highLight.findBar.markOptions.separateWordSearch;
		$('#cb_findBarMarkOptionsIgnorePunctuation').checked = userOptions.highLight.findBar.markOptions.ignorePunctuation;
		$('#cb_findBarMarkOptionsCaseSensitive').checked = userOptions.highLight.findBar.markOptions.caseSensitive;
		$('#s_findBarMarkOptionsAccuracy').value = userOptions.highLight.findBar.markOptions.accuracy;
		$('#n_findBarMarkOptionsLimit').value = userOptions.highLight.findBar.markOptions.limit;
		
		$('#cb_findBarStartOpen').checked = userOptions.highLight.findBar.startOpen;
		$('#cb_findBarOpenInAllTabs').checked = userOptions.highLight.findBar.openInAllTabs;
		$('#cb_findBarSearchInAllTabs').checked = userOptions.highLight.findBar.searchInAllTabs;
		$('#s_findBarPosition').value = userOptions.highLight.findBar.position;
		$('#s_findBarWindowType').value = userOptions.highLight.findBar.windowType;
		$('#cb_findBarShowNavBar').checked = userOptions.highLight.findBar.showNavBar;
		$('#n_findBarTimeout').value = userOptions.highLight.findBar.keyboardTimeout;
		$('#range_findBarScale').value = userOptions.highLight.findBar.scale;
		// $('#i_findBarScale').value = (parseFloat(userOptions.highLight.findBar.scale) * 100).toFixed(0) + "%";
	
		$('#n_searchBarHistoryLength').value = userOptions.searchBarHistoryLength;
		$('#n_searchBarSuggestionsCount').value = userOptions.searchBarSuggestionsCount;
		$('#cb_groupLabelMoreTile').checked = userOptions.groupLabelMoreTile;
		$('#cb_groupFolderRowBreaks').checked = userOptions.groupFolderRowBreaks;
		$('#cb_autoCopy').checked = userOptions.autoCopy;
		$('#cb_rememberLastOpenedFolder').checked = userOptions.rememberLastOpenedFolder;
		$('#cb_autoPasteFromClipboard').checked = userOptions.autoPasteFromClipboard;
		$('#cb_allowHotkeysWithoutMenu').checked = userOptions.allowHotkeysWithoutMenu;
		
		$('#n_quickMenuHoldTimeout').value = userOptions.quickMenuHoldTimeout || 250;
		$('#cb_exportWithoutBase64Icons').checked = userOptions.exportWithoutBase64Icons;
		$('#cb_addSearchProviderHideNotification').checked = userOptions.addSearchProviderHideNotification;
		$('#cb_syncWithFirefoxSearch').checked = userOptions.syncWithFirefoxSearch;
		$('#cb_quickMenuTilesDraggable').checked = userOptions.quickMenuTilesDraggable; 
		$('#cb_disableNewTabSorting').checked = userOptions.disableNewTabSorting; 
		$('#cb_sideBarRememberState').checked = userOptions.sideBar.rememberState;
		$('#cb_sideBarOpenOnResults').checked = userOptions.sideBar.openOnResults;
		$('#cb_sideBarOpenOnResultsMinimized').checked = userOptions.sideBar.openOnResultsMinimized;
		$('#cb_quickMenuPreventPageClicks').checked = userOptions.quickMenuPreventPageClicks;
		$('#cb_omniboxDefaultToLastUsedEngine').checked = userOptions.omniboxDefaultToLastUsedEngine;
		$('#s_omniboxSearch').value = userOptions.omniboxSearch;
		$('#cb_contextMenuUseInnerText').checked = userOptions.contextMenuUseInnerText;
		$('#n_cacheIconsMaxSize').value = userOptions.cacheIconsMaxSize;

		$('#n_pageTilesRows').value = userOptions.pageTiles.rows;
		$('#n_pageTilesColumns').value = userOptions.pageTiles.columns;
		$('#cb_pageTilesEnabled').checked = userOptions.pageTiles.enabled;
		$('#s_pageTilesOpenMethod').value = userOptions.pageTiles.openMethod;
		$('#s_pageTilesPalette').value = userOptions.pageTiles.paletteString;
		$('#cb_pageTilesCloseOnShake').checked = userOptions.pageTiles.closeOnShake;
		
		$('#cb_contextMenuHotkeys').checked = userOptions.contextMenuHotkeys;

		$('#n_openFoldersOnHoverTimeout').value = userOptions.openFoldersOnHoverTimeout;
		$('#n_shakeSensitivity').value = userOptions.shakeSensitivity;

		$('#style_dark').disabled = !userOptions.nightMode;

		$('#cb_quickMenuToolsLockPersist').checked = (() => {
			let tool = userOptions.quickMenuTools.find( t => t.name === "lock"); 
			return (tool) ? tool.persist || false : false;
		})();

		$('#cb_quickMenuToolsRepeatSearchPersist').checked = (() => {
			let tool = userOptions.quickMenuTools.find( t => t.name === "repeatsearch"); 
			return (tool) ? tool.persist || false : false;
		})();

		buildSearchEngineContainer();
				
		// allow context menu on right-click
		(() => {
			function onChange(e) {
				document.querySelector('[data-i18n="HoldForContextMenu"]').style.display = ( $('#s_quickMenuMouseButton').value === "3" && $('#s_quickMenuOnMouseMethod').value === "click" ) ? null : 'none';	
			}
			
			[$('#s_quickMenuMouseButton'), $('#s_quickMenuOnMouseMethod')].forEach( s => {
				s.addEventListener('change', onChange);	
				onChange();
			});
		})();

		buildToolIcons();

		document.dispatchEvent(new CustomEvent('userOptionsLoaded'));
	}
  
	function onError(error) {
		console.log(`Error: ${error}`);
	}

	browser.runtime.getBackgroundPage().then( w => {
		w.checkForOneClickEngines().then(c => onGot(w), onError);
	}, onError);
	
}

function saveOptions(e) {
	
	function onSet() {
		showSaveMessage(browser.i18n.getMessage("saved"), null, document.getElementById('saveNoticeDiv'));
		return Promise.resolve(true);
	}
	
	function onError(error) {
		console.log(`Error: ${error}`);
	}
	
	userOptions = {
		searchEngines: userOptions.searchEngines,
		nodeTree: JSON.parse(JSON.stringify(userOptions.nodeTree)),
		lastUsedId: userOptions.lastUsedId,
		quickMenu: $('#cb_quickMenu').checked,
		quickMenuColumns: parseInt($('#n_quickMenuColumns').value),
		quickMenuRows: parseInt($('#n_quickMenuRows').value),
		quickMenuRowsSingleColumn: parseInt($('#n_quickMenuRowsSingleColumn').value),
		defaultGroupColor: userOptions.defaultGroupColor,
		
		quickMenuKey: parseInt($('#b_quickMenuKey').value),
		contextMenuKey: parseInt($('#b_contextMenuKey').value),
		
		quickMenuOnKey: $('#r_quickMenuOnKey').checked,
		quickMenuOnDrag: $('#cb_quickMenuOnDrag').checked,
		quickMenuOnMouse: $('#cb_quickMenuOnMouse').checked,
		quickMenuOnMouseMethod: $('#s_quickMenuOnMouseMethod').value,
		quickMenuSearchOnMouseUp: $('#cb_quickMenuSearchOnMouseUp').checked,
		quickMenuMouseButton: parseInt($("#s_quickMenuMouseButton").value),
		quickMenuAuto: $('#r_quickMenuAuto').checked,
		quickMenuAutoOnInputs: $('#cb_quickMenuAutoOnInputs').checked,
		quickMenuOnLinks: $('#cb_quickMenuOnLinks').checked,
		quickMenuOnImages: $('#cb_quickMenuOnImages').checked,
		quickMenuScale: parseFloat($('#range_quickMenuScale').value),
		quickMenuIconScale: parseFloat($('#range_quickMenuIconScale').value),
		quickMenuOffset: {x: parseInt($('#n_quickMenuOffsetX').value), y: parseInt($('#n_quickMenuOffsetY').value)},
		quickMenuCloseOnScroll: $('#cb_quickMenuCloseOnScroll').checked,
		quickMenuCloseOnClick: $('#cb_quickMenuCloseOnClick').checked,
		quickMenuPosition: $('#h_position').value,
		contextMenuClick: $('#s_contextMenuClick').value,
		contextMenuMiddleClick: $('#s_contextMenuMiddleClick').value,
		contextMenuRightClick: $('#s_contextMenuRightClick').value,
		contextMenuShift: $('#s_contextMenuShift').value,
		contextMenuCtrl: $('#s_contextMenuCtrl').value,
		contextMenuSearchLinksAs: $('#s_contextMenuSearchLinksAs').value,
		contextMenuShowAddCustomSearch: $('#cb_contextMenuShowAddCustomSearch').checked,
		contextMenuShowRecentlyUsed: $('#cb_contextMenuShowRecentlyUsed').checked,
		contextMenuShowRecentlyUsedAsFolder: $('#cb_contextMenuShowRecentlyUsedAsFolder').checked,
		contextMenuShowFolderSearch: $('#cb_contextMenuShowFolderSearch').checked,	
		quickMenuLeftClick: $('#s_quickMenuLeftClick').value,
		quickMenuRightClick: $('#s_quickMenuRightClick').value,
		quickMenuMiddleClick: $('#s_quickMenuMiddleClick').value,
		quickMenuShift: $('#s_quickMenuShift').value,
		quickMenuCtrl: $('#s_quickMenuCtrl').value,
		quickMenuAlt: $('#s_quickMenuAlt').value,		
		quickMenuFolderLeftClick: $('#s_quickMenuFolderLeftClick').value,
		quickMenuFolderRightClick: $('#s_quickMenuFolderRightClick').value,
		quickMenuFolderMiddleClick: $('#s_quickMenuFolderMiddleClick').value,
		quickMenuFolderShift: $('#s_quickMenuFolderShift').value,
		quickMenuFolderCtrl: $('#s_quickMenuFolderCtrl').value,
		quickMenuFolderAlt: $('#s_quickMenuFolderAlt').value,
		quickMenuSearchHotkeys: $('#s_quickMenuSearchHotkeys').value,
		quickMenuSearchHotkeysFolders: $('#s_quickMenuSearchHotkeysFolders').value,
		quickMenuSearchBar: $('#s_quickMenuSearchBar').value,
		quickMenuSearchBarFocus: $('#cb_quickMenuSearchBarFocus').checked,
		quickMenuSearchBarSelect: $('#cb_quickMenuSearchBarSelect').checked,
		quickMenuAutoMaxChars: parseInt($('#n_quickMenuAutoMaxChars').value) || 0,
		quickMenuOpeningOpacity: parseFloat($('#n_quickMenuOpeningOpacity').value) || .3,
		quickMenuAutoTimeout: parseInt($('#n_quickMenuAutoTimeout').value),
		quickMenuAllowContextMenu: !$('#cb_quickMenuAllowContextMenu').checked,
		
		quickMenuOnSimpleClick: {
			enabled: $('#cb_quickMenuOnSimpleClick').checked,
			button: parseInt($('#s_quickMenuOnSimpleClickButton').value),
			alt: $('#cb_quickMenuOnSimpleClickAlt').checked,
			ctrl: $('#cb_quickMenuOnSimpleClickCtrl').checked,
			shift: $('#cb_quickMenuOnSimpleClickShift').checked,
			useInnerText: $('#cb_quickMenuSimpleClickUseInnerText').checked
		},
		
		contextMenu: $('#cb_contextMenu').checked,
		contextMenuOnLinks: $('#cb_contextMenuOnLinks').checked,
		contextMenuOnImages: $('#cb_contextMenuOnImages').checked,
		
		quickMenuToolsPosition: $('#s_quickMenuToolsPosition').value,
		quickMenuToolsAsToolbar: $('#cb_quickMenuToolsAsToolbar').checked,

		searchBarUseOldStyle: $('#s_searchBarDefaultView').value === "text",
		searchBarColumns: parseInt($('#n_searchBarColumns').value),
		searchBarCloseAfterSearch: $('#cb_searchBarCloseAfterSearch').checked,
		
		quickMenuUseOldStyle: $('#s_quickMenuDefaultView').value === "text",
		
		 // take directly from loaded userOptions
		searchBarSuggestions: $('#cb_searchBarSuggestions').checked,
		searchBarEnableHistory: $('#cb_searchBarEnableHistory').checked,
		searchBarHistory: userOptions.searchBarHistory,
		searchBarDisplayLastSearch: $('#cb_searchBarDisplayLastSearch').checked,
		
		sideBar: {
			enabled: userOptions.sideBar.enabled,
			columns:parseInt($('#n_sideBarColumns').value),
			singleColumn:$('#s_sideBarDefaultView').value === "text",
			hotkey: [],
			startOpen: $('#cb_sideBarStartOpen').checked,
			widget: {
				enabled: $('#cb_sideBarWidgetEnable').checked,
				position: $('#s_sideBarWidgetPosition').value,
				offset: userOptions.sideBar.widget.offset
			},
			windowType: userOptions.sideBar.windowType,
			offsets: userOptions.sideBar.offsets,
			position: userOptions.sideBar.position,
			height: userOptions.sideBar.height,
			closeAfterSearch: $('#cb_sideBarCloseAfterSearch').checked,
			rememberState: $('#cb_sideBarRememberState').checked,
			openOnResults: $('#cb_sideBarOpenOnResults').checked,
			openOnResultsMinimized: $('#cb_sideBarOpenOnResultsMinimized').checked,
			scale: parseFloat($('#range_sideBarScale').value),
		},
		
		highLight: {
			enabled: $('#cb_highLightEnabled').checked,
			followDomain: $('#cb_highLightFollowDomain').checked,
			followExternalLinks: $('#cb_highLightFollowExternalLinks').checked,
			showFindBar: $('#cb_highLightShowFindBar').checked,
			flashSelected: $('#cb_highLightFlashSelected').checked,
			highlightStyle: $('#s_highLightStyle').value,
			opacity: parseFloat($('#s_highLightOpacity').value),
			
			styles: [
				{	
					color: $('#c_highLightColor0').value,
					background: $('#c_highLightBackground0').value
				},
				{	
					color: $('#c_highLightColor1').value,
					background: $('#c_highLightBackground1').value
				},
				{	
					color: $('#c_highLightColor2').value,
					background: $('#c_highLightBackground2').value
				},
				{	
					color: $('#c_highLightColor3').value,
					background: $('#c_highLightBackground3').value
				}
			],
			activeStyle: {
				color: $('#c_highLightColorActive').value,
				background: $('#c_highLightBackgroundActive').value
			},
			navBar: {
				enabled: $('#cb_highLightNavBarEnabled').checked
			},
			findBar: {
				startOpen: $('#cb_findBarStartOpen').checked,
				openInAllTabs: $('#cb_findBarOpenInAllTabs').checked,
				searchInAllTabs: $('#cb_findBarSearchInAllTabs').checked,
				showNavBar: $('#cb_findBarShowNavBar').checked,
				position: $('#s_findBarPosition').value,
				keyboardTimeout: parseInt($('#n_findBarTimeout').value),
				windowType: $('#s_findBarWindowType').value,
				offsets: userOptions.highLight.findBar.offsets,
				markOptions: {
					separateWordSearch: $('#cb_findBarMarkOptionsSeparateWordSearch').checked,
					ignorePunctuation: $('#cb_findBarMarkOptionsIgnorePunctuation').checked,
					caseSensitive: $('#cb_findBarMarkOptionsCaseSensitive').checked,
					accuracy: $('#s_findBarMarkOptionsAccuracy').value,
					limit: parseInt($('#n_findBarMarkOptionsLimit').value)
				},
				scale: parseFloat($('#range_findBarScale').value),
			},
			markOptions: {
				separateWordSearch: $('#cb_highLightMarkOptionsSeparateWordSearch').checked,
				ignorePunctuation: $('#cb_highLightMarkOptionsIgnorePunctuation').checked,
				caseSensitive: $('#cb_highLightMarkOptionsCaseSensitive').checked,
				accuracy: $('#s_highLightMarkOptionsAccuracy').value,
				limit: parseInt($('#n_highLightMarkOptionsLimit').value)
			}
		},
		
		userStyles: $('#t_userStyles').value,
		userStylesEnabled: $('#cb_userStylesEnabled').checked,
		userStylesGlobal: (() => {
			
			let styleText = "";

			let styleEl = document.createElement('style');

			document.head.appendChild(styleEl);

			styleEl.innerText = $('#t_userStyles').value;
			styleEl.sheet.disabled = true;

			let sheet = styleEl.sheet;
			
			if ( !sheet ) return;

			for ( let i in sheet.cssRules ) {
				let rule = sheet.cssRules[i];
				
				if ( /^[\.|#]CS_/.test(rule.selectorText) )
					styleText+=rule.cssText + "\n";
			}
		
			styleEl.parentNode.removeChild(styleEl);
			
			return styleText;
		})(),
	
		enableAnimations: $('#cb_enableAnimations').checked,
		quickMenuTheme: $('#s_quickMenuTheme').value,
		
		searchBarHistoryLength: parseInt($('#n_searchBarHistoryLength').value),
		searchBarSuggestionsCount: parseInt($('#n_searchBarSuggestionsCount').value),
		groupLabelMoreTile: $('#cb_groupLabelMoreTile').checked,
		groupFolderRowBreaks: $('#cb_groupFolderRowBreaks').checked,
		autoCopy: $('#cb_autoCopy').checked,
		autoPasteFromClipboard: $('#cb_autoPasteFromClipboard').checked,
		allowHotkeysWithoutMenu: $('#cb_allowHotkeysWithoutMenu').checked,
		rememberLastOpenedFolder: $('#cb_rememberLastOpenedFolder').checked,
		quickMenuHoldTimeout: parseInt($('#n_quickMenuHoldTimeout').value),
		exportWithoutBase64Icons: $('#cb_exportWithoutBase64Icons').checked,
		addSearchProviderHideNotification: $('#cb_addSearchProviderHideNotification').checked,
		syncWithFirefoxSearch: $('#cb_syncWithFirefoxSearch').checked,
		quickMenuTilesDraggable: $('#cb_quickMenuTilesDraggable').checked,
		recentlyUsedList: userOptions.recentlyUsedList,
		recentlyUsedListLength: parseInt($('#n_contextMenuRecentlyUsedLength').value),
		disableNewTabSorting: $('#cb_disableNewTabSorting').checked,
		contextMenuHotkeys: $('#cb_contextMenuHotkeys').checked,
		quickMenuPreventPageClicks: $('#cb_quickMenuPreventPageClicks').checked,
		openFoldersOnHoverTimeout: parseInt($('#n_openFoldersOnHoverTimeout').value),
		omniboxDefaultToLastUsedEngine: $('#cb_omniboxDefaultToLastUsedEngine').checked,
		omniboxLastUsedIds: userOptions.omniboxLastUsedIds,
		omniboxSearch: $('#s_omniboxSearch').value,
		contextMenuUseInnerText: $('#cb_contextMenuUseInnerText').checked,
		cacheIconsMaxSize: parseInt($('#n_cacheIconsMaxSize').value),
		nightMode: userOptions.nightMode,
		userShortcuts: userOptions.userShortcuts,
		shakeSensitivity: parseInt($('#n_shakeSensitivity').value),

		pageTiles: {
			enabled: $('#cb_pageTilesEnabled').checked,
			rows: parseInt($('#n_pageTilesRows').value),
			columns: parseInt($('#n_pageTilesColumns').value),
			openMethod: $('#s_pageTilesOpenMethod').value,
			grid: userOptions.pageTiles.grid,
			paletteString: $('#s_pageTilesPalette').value,
			closeOnShake: $('#cb_pageTilesCloseOnShake').checked
		},

		quickMenuTools: userOptions.quickMenuTools
	}

	var setting = browser.runtime.sendMessage({action: "saveUserOptions", userOptions: userOptions});
	return setting.then(onSet, onError);
}

document.addEventListener("DOMContentLoaded", makeTabs());
document.addEventListener("DOMContentLoaded", restoreOptions);

$('#cb_autoPasteFromClipboard').addEventListener('change', async (e) => {
	
	if ( e.target.checked === true ) {
		e.target.checked = await browser.permissions.request({permissions: ["clipboardRead"]});
		saveOptions();
	}
});

$('#cb_autoCopy').addEventListener('change', async (e) => {
	if ( e.target.checked === true ) {
		e.target.checked = await browser.permissions.request({permissions: ["clipboardWrite"]});
		saveOptions();
	}
});

// listen to all checkboxes for change
document.querySelectorAll("input[type='checkbox'], input[type='color']").forEach( el => {
	el.addEventListener('change', saveOptions);
});

// listen to all select for change
document.querySelectorAll('select').forEach( el => {
	el.addEventListener('change', saveOptions);
});

[	'#n_quickMenuColumns',
	'#n_quickMenuRows',
	'#n_quickMenuRowsSingleColumn',
	'#n_quickMenuOffsetX',
	'#n_quickMenuOffsetY',
	'#n_searchBarColumns',
	'#n_sideBarColumns',
	'#n_quickMenuAutoMaxChars',
	'#n_quickMenuAutoTimeout',
	'#n_findBarTimeout', 
	'#n_findBarMarkOptionsLimit', 
	'#n_highLightMarkOptionsLimit',
	'#n_quickMenuOpeningOpacity',
	'#n_contextMenuRecentlyUsedLength'
].forEach( id => $(id).addEventListener('change',  saveOptions) );


["quickMenuScale", "sideBarScale", "findBarScale", "quickMenuIconScale"].forEach( id => {
	$(`#range_${id}`).addEventListener('input', ev => {
		$(`#i_${id}`).value = (parseFloat(ev.target.value) * 100).toFixed(0) + "%";
	});

	$(`#range_${id}`).addEventListener('change', saveOptions);

	document.addEventListener('userOptionsLoaded', e => $(`#range_${id}`).dispatchEvent(new Event('input')));
});

$('#t_userStyles').addEventListener('change', saveOptions);

$('#cb_userStylesEnabled').addEventListener('change', e => {
	$('#t_userStyles').disabled = ! e.target.checked;
	saveOptions(e);
});

$('#b_quickMenuKey').addEventListener('click', keyButtonListener);
$('#b_contextMenuKey').addEventListener('click', keyButtonListener);

$('#cb_syncWithFirefoxSearch').addEventListener('change', e => {
	$('#searchEnginesParentContainer').style.display = e.target.checked ? "none" : null;
});
document.addEventListener('userOptionsLoaded', e => {
	$('#searchEnginesParentContainer').style.display = $('#cb_syncWithFirefoxSearch').checked ? "none" : null;
});

function keyButtonListener(e) {
	e.target.innerText = '';
	var img = document.createElement('img');
	img.src = 'icons/spinner.svg';
	e.target.appendChild(img);
	e.target.addEventListener('keydown', function(evv) {
	
		if ( evv.key === "Escape" ) {
			e.target.innerText = browser.i18n.getMessage('ClickToSet');
			e.target.value = 0;
		} else {
			e.target.innerText = keyCodeToString(evv.which);
			e.target.value = evv.which;
		}
		
		saveOptions(e);
		
		}, {once: true} // parameter to run once, then delete
	); 
}

function fixNumberInput(el, _default, _min, _max) {

	if (isNaN(el.value) || el.value === "") el.value = _default;
	if (!el.value.isInteger) el.value = Math.floor(el.value);
	if (el.value > _max) el.value = _max;
	if (el.value < _min) el.value = _min;
}

function getKeyString(keys) {
	if ( Array.isArray(keys) ) {
		keys.forEach((key, index) => {
			keys[index] = keyCodeToString(key);
		});
		
		console.log(keys);
	} else {
	}
}

function keyCodeToString(code) {
	if ( code === 0 ) return null;
	
	return keyTable[code] /*|| String.fromCharCode(code)*/ || code.toString();
}

function keyArrayToButtons(arr, options) {

	options = options || {}
	
	let div = document.createElement('div');
	
	function makeButton(str) {
		let span = document.createElement(options.nodeType || 'span');
		span.innerText = str;
		span.className = options.className || null;
		span.style = options.style || null;
		return span;
	}
	
	if ( Array.isArray(arr) ) {
	
		if (arr.length === 0) {
			div.innerText = 'text' in options ? options.text : browser.i18n.getMessage('ClickToSet') || "Click to set";
		}
		
		for (let i=0;i<arr.length;i++) {

			let hk = arr[i]
			let key = keyCodeToString(hk);
			if (key.length === 1) key = key.toUpperCase();
			
			div.appendChild(makeButton(key));
		}
	} else if ( typeof arr === 'object' ) {
		if ( arr.alt ) div.appendChild(makeButton("Alt"));
		if ( arr.ctrl ) div.appendChild(makeButton("Ctrl"));
		if ( arr.meta ) div.appendChild(makeButton("Meta"));
		if ( arr.shift ) div.appendChild(makeButton("Shift"));
		
		div.appendChild(makeButton(arr.key));
	} else {
		console.error('keyCodeToString error')
		return;
	}
	
	let buttons = div.querySelectorAll(options.nodeType || 'span');
	for ( let i=1;i<buttons.length;i++ ) {
		let spacer = document.createElement('span');
		spacer.innerHTML = '&nbsp;+&nbsp;';
		div.insertBefore(spacer, buttons[i]);
	}
	
	return div;
}

document.addEventListener('DOMContentLoaded', hashChange);
window.addEventListener('hashchange', hashChange);
	
// switch to tab based on params
function hashChange(e) {	

	let hash = location.hash.split("#");
	
	let buttons = document.querySelectorAll('.tablinks');
	
	// no hash, click first buttony
	if ( !hash || !hash[1] ) {
		buttons[0].click();
		return;
	}
	
	for ( button of buttons ) {
		if ( button.dataset.tabid.toLowerCase() === (hash[1] + "tab").toLowerCase() ) {
			button.click();
			break;
		}
	}
	
}

function makeTabs() {
	
	let tabs = document.getElementsByClassName("tablinks");
	for (let tab of tabs) {
		tab.addEventListener('click', e => {

			document.querySelectorAll('.tabcontent').forEach( el => {
				el.style.display = "none";
			});
				
			// Get all elements with class="tablinks" and remove the class "active"
			for (let tablink of document.getElementsByClassName("tablinks"))
				tablink.classList.remove('active');

			// Show the current tab, and add an "active" class to the button that opened the tab
			document.getElementById(e.target.dataset.tabid).style.display = "block";
			e.currentTarget.classList.add('active');
			
			location.hash = e.target.dataset.tabid.toLowerCase().replace(/tab$/,"");
		});
	}
}

function buildToolIcons() {

	function getToolIconIndex(element) {
		return [].indexOf.call(document.querySelectorAll('.toolIcon'), element);
	}
	function dragstart_handler(ev) {
		ev.currentTarget.style.border = "dashed transparent";
		ev.dataTransfer.setData("text", getToolIconIndex(ev.target));
		ev.effectAllowed = "copyMove";
	}
	function dragover_handler(ev) {
		for (let icon of document.getElementsByClassName('toolIcon'))
			icon.style.backgroundColor='';
		
		ev.target.style.backgroundColor='#ddd';
		ev.preventDefault();
	}
	function drop_handler(ev) {
		ev.preventDefault();
		
		ev.target.style.border = '';
		ev.target.style.backgroundColor = '';
		let old_index = ev.dataTransfer.getData("text");
		let new_index = getToolIconIndex(ev.target);

		ev.target.parentNode.insertBefore(document.getElementsByClassName('toolIcon')[old_index], (new_index > old_index) ? ev.target.nextSibling : ev.target);
	}
	function dragend_handler(ev) {
		ev.target.style.border = '';
		saveQuickMenuTools();
	}
	function saveQuickMenuTools() {
		let tools = [];
		let tool_buttons = document.querySelectorAll('#toolIcons .toolIcon');

		tool_buttons.forEach(b => {
			let tool = { name: b.name, disabled: b.disabled};

			if ( b.name === "lock" ) tool.persist = $('#cb_quickMenuToolsLockPersist').checked;
			if ( b.name === "repeatsearch" ) tool.persist = $('#cb_quickMenuToolsRepeatSearchPersist').checked;

			tools.push(tool);
		});

		userOptions.quickMenuTools = tools;
		saveOptions();
	}
	
	var toolIcons = [];
	QMtools.forEach( tool => {
		toolIcons.push({name: tool.name, src: tool.icon, title: tool.title, index: Number.MAX_VALUE, disabled: true});
	});

	toolIcons.forEach( toolIcon => {
		toolIcon.index = userOptions.quickMenuTools.findIndex( tool => tool.name === toolIcon.name );
		// update quickMenuTools array with missing tools
		if ( toolIcon.index === -1) {
			toolIcon.index = userOptions.quickMenuTools.length
			userOptions.quickMenuTools.push({name: toolIcon.name, disabled: toolIcon.disabled});
		}
		
		toolIcon.disabled = userOptions.quickMenuTools[toolIcon.index].disabled;
	});

	toolIcons = toolIcons.sort(function(a, b) {
		return (a.index < b.index) ? -1 : 1;
	});

	for (let icon of toolIcons) {
		let img = document.createElement('div');
		img.disabled = icon.disabled;
		img.style.opacity = (img.disabled) ? .4 : 1;
		img.className = 'toolIcon';
		img.setAttribute('draggable', true);
		img.src = icon.src;
		img.setAttribute('data-title',icon.title);
		img.name = icon.name;
		img.classList.add('tool');
		img.style.setProperty('--mask-image', `url(${icon.src})`);

		img.addEventListener('dragstart',dragstart_handler);
		img.addEventListener('dragend',dragend_handler);
		img.addEventListener('drop',drop_handler);
		img.addEventListener('dragover',dragover_handler);

		img.addEventListener('click',e => {
			img.disabled = img.disabled || false;
			img.style.opacity = img.disabled ? 1 : .4;
			img.disabled = !img.disabled;
			saveQuickMenuTools();	
		});
		
		let t_toolIcons = $('#t_toolIcons');
		img.addEventListener('mouseover', e => {
			t_toolIcons.innerText = e.target.dataset.title;
		});
		
		img.addEventListener('mouseout', e => {
			t_toolIcons.innerText = browser.i18n.getMessage(t_toolIcons.dataset.i18n);
		});

		$('#toolIcons').appendChild(img);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	for (let el of document.getElementsByClassName('position')) {
		el.addEventListener('click', e => {
			for (let _el of document.getElementsByClassName('position'))
				_el.className = _el.className.replace(' active', '');
			el.className+=' active';
			$('#h_position').value = el.dataset.position;
			saveOptions();
		});
		
		let t_position = $('#t_position');
		el.addEventListener('mouseover', e => {
			let parts = e.target.dataset.position.split(" ");
			t_position.innerText = browser.i18n.getMessage("PositionRelativeToCursor").replace("%1", browser.i18n.getMessage(parts[0])).replace("%2",browser.i18n.getMessage(parts[1]));
		});
		
		el.addEventListener('mouseout', e => {
			t_position.innerText = browser.i18n.getMessage(t_position.dataset.i18n);
		});
		
	}
	
});

document.addEventListener("DOMContentLoaded", () => {
	$('#version').innerText = "" + browser.runtime.getManifest().version;
});

// browser-specific modifications
document.addEventListener("DOMContentLoaded", e => {
	if (!browser.runtime.getBrowserInfo) {
		for (let el of document.querySelectorAll('[data-browser="firefox"]'))
			el.style.display = 'none';
	} else {
		browser.runtime.getBrowserInfo().then( info => {
			let version = info.version;
			document.querySelectorAll('[data-browser="firefox"][data-minversion]').forEach( el => {
				if ( el.dataset.minversion > info.version )
					el.style.display = 'none';
			});	
		});
	}
	
	
});

function showInfoMsg(el, msg) {
	let div = $('#info_msg');
		
	let parsed = new DOMParser().parseFromString(msg, `text/html`);
	let tag = parsed.getElementsByTagName('body')[0];
				
	div.innerHTML = null;
	let point = document.createElement('div');
	point.className = 'point';
	div.appendChild(point);
	div.appendChild(tag.firstChild);

	let rect = el.getBoundingClientRect()

	div.style.top = rect.top + window.scrollY + 26 + 'px';
	div.style.left = rect.left + rect.width / 2 + window.scrollX - 16 + 'px';
	
	if (rect.left > ( window.innerWidth - 220) )
		div.style.left = parseFloat(div.style.left) - 230 + "px";
	
	div.style.display = 'block';

}

// set up info bubbles
document.addEventListener("DOMContentLoaded", () => {
	
	let i18n_tooltips = document.querySelectorAll('[data-i18n_tooltip]');
	
	for (let el of i18n_tooltips) {
		el.dataset.msg = browser.i18n.getMessage(el.dataset.i18n_tooltip + 'Tooltip') || el.dataset.msg || el.dataset.i18n_tooltip;
		
		el.addEventListener('mouseenter', e => {
			showInfoMsg(el, el.dataset.msg);
		});
		
		el.addEventListener('mouseleave', e => {
			$('#info_msg').style.display = 'none';
		});
	}
});

// import/export buttons
document.addEventListener("DOMContentLoaded", () => {
	
	function download(filename, text) {
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	}
	
	let b_export = $('#b_exportSettings');
	b_export.onclick = function() {

		let date = new Date().toISOString().replace(/:|\..*/g,"").replace("T", "_");
		
		if ( userOptions.exportWithoutBase64Icons ) {
			let uoCopy = Object.assign({}, userOptions);
			uoCopy.searchEngines.forEach( se => se.icon_base64String = "");
			findNodes(uoCopy.nodeTree, node => {
				if ( node.type === "oneClickSearchEngine" )
					node.icon = "";
			});
			download(`ContextSearchOptions_${date}.json`, JSON.stringify(uoCopy));
		} else {
			download(`ContextSearchOptions_${date}.json`, JSON.stringify(userOptions));
		}
	}
	
	let b_import = $('#b_importSettings');
	b_import.onclick = function() {
		$('#importSettings').click();
	}
	
	$('#importSettings').addEventListener('change', e => {
		var reader = new FileReader();

		// Closure to capture the file information.
		reader.onload = () => {
			try {
				let newUserOptions = JSON.parse(reader.result);
				
				// run a few test to check if it's valid
				if ( 
					typeof newUserOptions !== 'object'
					|| newUserOptions.quickMenu === undefined
					|| !newUserOptions.searchEngines
					
				) {
					alert(browser.i18n.getMessage("ImportSettingsNotFoundAlert"));
					return;
				}
				
				// update imported options
				browser.runtime.getBackgroundPage().then( async w => {
					let _uo = w.updateUserOptionsObject(newUserOptions);
					try {
						_uo = await w.updateUserOptionsVersion(_uo);
					} catch ( error ) {
						if ( !confirm("Failed to update config. This may cause some features to not work. Install anyway?"))
							return;
					}
	
					// load icons to base64 if missing
					let overDiv = document.createElement('div');
					overDiv.style = "position:fixed;left:0;top:0;height:100%;width:100%;z-index:9999;background-color:rgba(255,255,255,.85);background-image:url(icons/spinner.svg);background-repeat:no-repeat;background-position:center center;background-size:64px 64px;line-height:100%";
					// overDiv.innerText = "Fetching remote content";
					let msgDiv = document.createElement('div');
					msgDiv.style = "text-align:center;font-size:12px;color:black;top:calc(50% + 44px);position:relative;background-color:white";
					msgDiv.innerText = browser.i18n.getMessage("Fetchingremotecontent");
					overDiv.appendChild(msgDiv);
					document.body.appendChild(overDiv);
					let sesToBase64 = _uo.searchEngines.filter(se => !se.icon_base64String);
					let details = await loadRemoteIcon({searchEngines: sesToBase64, timeout:10000});
					_uo.searchEngines.forEach( (se,index) => {
						let updatedSe = details.searchEngines.find( _se => _se.id === se.id );
						
						if ( updatedSe ) _uo.searchEngines[index].icon_base64String = updatedSe.icon_base64String;
					});
					
					// load OCSE favicons
					if ( browser.search && browser.search.get ) {
						let ocses = await browser.search.get();
						findNodes(_uo.nodeTree, node => {
							if ( node.type === "oneClickSearchEngine" && !node.icon ) {
								let ocse = ocses.find(_ocse => _ocse.name === node.title);	
								if ( ocse ) node.icon = ocse.favIconUrl;
							}
						});
					} else {
						findNodes(_uo.nodeTree, node => {
							if ( node.type === "oneClickSearchEngine" ) node.hidden = true;
						});
					}

					userOptions = _uo;
					await browser.runtime.sendMessage({action: "saveUserOptions", userOptions: _uo});
					location.reload();
				});

			} catch(err) {
				alert(browser.i18n.getMessage("InvalidJSONAlert"));
			}
		}

      // Read in the image file as a data URL.
      reader.readAsText(e.target.files[0]);
	});
});

// click element listed in the hash for upload buttons
document.addEventListener('DOMContentLoaded', () => {
	let params = new URLSearchParams(window.location.search);
	
	if (params.has('click')) {
		document.getElementById(params.get('click')).click();
		history.pushState("", document.title, window.location.pathname);
	}
});	

document.addEventListener('DOMContentLoaded', () => {

	function traverse(node) {
		
		if (node.nodeType === 3 && node.nodeValue.trim())
			return node;

		for (let child of node.childNodes) {
			let c = traverse(child);
			if (c) return c;
		}
		
		return false;
	}
	
	let i18n = document.querySelectorAll('[data-i18n]');
	
	for (let el of i18n) {

		let textNode = traverse(el);
		
		if (browser.i18n.getMessage(el.dataset.i18n)) {
			textNode.nodeValue = browser.i18n.getMessage(el.dataset.i18n);
			
			if (el.title === "i18n_text")
				el.title = browser.i18n.getMessage(el.dataset.i18n);
		}

	}

	// add locale-specific styling
	var link = document.createElement( "link" );
	link.href = browser.runtime.getURL('/_locales/' + browser.i18n.getUILanguage() + '/style.css');
	link.type = "text/css";
	link.rel = "stylesheet";
	document.getElementsByTagName( "head" )[0].appendChild( link );
	
	// set up localized help pages
	let help = $('#helpTab');
	
	let loaded = false;
	let iframe = document.createElement('iframe');
	
	iframe.style = 'display:none';
	iframe.onerror = function() {
		console.log('error');
	}
	
	iframe.onload = function() {
		console.log('loaded @ ' + iframe.src);
		var iframeDocument = iframe.contentDocument;
		
		if (!iframeDocument) return;
		
		var iframeBody = iframeDocument.body;
		
		const parser = new DOMParser();
		const parsed = parser.parseFromString(iframeBody.innerHTML, `text/html`);
		
		for (let child of parsed.getElementsByTagName('body')[0].childNodes) {
			help.appendChild(child);
		}

		help.removeChild(iframe);
		
		help.querySelectorAll("[data-gif]").forEach( el => {
			el.addEventListener('click', _e => {
				let div = document.createElement('div');
				div.style = 'position:fixed;top:0;bottom:0;left:0;right:0;background-color:rgba(0,0,0,.8);z-index:2;text-align:center';
				
				div.onclick = function() {
					div.parentNode.removeChild(div);
				}
				
				let img = document.createElement('img');
				img.src = el.dataset.gif;
				img.style.maxHeight = '75vh';
				img.style.marginTop = '12.5vh';
				img.style.maxWidth = '75vw';
					
				img.onload = function() {
					div.appendChild(img);
					el.style.backgroundImage = 'url("' + img.src + '")';
					el.style.backgroundSize = '100% 100%';
				}
				
				help.appendChild(div);
			});
		});
	}
	
	setTimeout(() => {
		if (!loaded) iframe.src = '/_locales/' + browser.runtime.getManifest().default_locale + '/help.html';
	}, 250);
	
	iframe.src = '/_locales/' + browser.i18n.getUILanguage() + '/help.html';
	
	help.appendChild(iframe);

});
	
document.addEventListener('DOMContentLoaded', () => {
	let div = $('#d_clearSearchHistory');
	div.animating = false;
	div.onclick = function() {
		if (div.animating) return false;
		div.animating = true;
		
		userOptions.searchBarHistory = [];
		saveOptions();
		
		let yes = document.createElement('div');
		yes.className = 'yes';
		yes.style.verticalAlign = 'top';
		yes.style.height = yes.style.width = '1em';
		div.appendChild(yes);
		
		yes.addEventListener('transitionend', e => {
			div.removeChild(yes);
			div.animating = false;
		});
		
		yes.getBoundingClientRect();
		yes.style.opacity = 0;
	}
});

function showSaveMessage(str, color, el) {

	// clear and set save message
	el.innerHTML = null;	
	let msgSpan = document.createElement('span');

	msgSpan.style = "display:inline-block;font-size:10pt;font-family:'Courier New', monospace;font-weight:600;opacity:1;transition:opacity 1s .75s;padding:1px 12px;border-radius:8px;box-shadow:4px 4px 8px #0003;border:2px solid var(--border1)";
	msgSpan.style.backgroundColor = "var(--bg-color2)";
	msgSpan.innerText = str;

	let div = document.createElement('div')
	div.className = 'yes';
	div.style.verticalAlign = 'middle';
	div.style.marginRight = '16px';
	div.style.marginLeft = '0';
	div.style.height = div.style.width = "1em";
	msgSpan.insertBefore(div, msgSpan.firstChild);

	el.appendChild(msgSpan);
	
	msgSpan.addEventListener('transitionend', e => {
		msgSpan.parentNode.removeChild(msgSpan);
	});

	msgSpan.getBoundingClientRect(); // reflow
	msgSpan.style.opacity = 0;
}

document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('BUTTON.saveOptions').forEach( button => {
		button.onclick = saveOptions;
	});
});

document.addEventListener('userOptionsLoaded', () => document.body.style.opacity = 1);

// generate new search.json.mozlz4 
$("#replaceMozlz4FileButton").addEventListener('change', ev => {
	
	let searchEngines = [];
	let file = ev.target.files[0];
	
	// create backup with timestamp
	exportFile(file, "search.json.mozlz4_" + Date.now() );
	
	readMozlz4File(file, text => { // on success

		// parse the mozlz4 JSON into an object
		var json = JSON.parse(text);	

		let nodes = findNodes(userOptions.nodeTree, n => ["searchEngine", "oneClickSearchEngine"].includes(n.type) );
		
		// console.log(json.engines);
		
		let ses = [];

		nodes.forEach( n => {
			if ( n.type === "searchEngine" ) {
				let se = userOptions.searchEngines.find( _se => _se.id === n.id );
				if ( se ) ses.push(CS2FF(se));
			}
			
			if ( n.type === "oneClickSearchEngine" ) {
				let ocse = json.engines.find( _ocse => _ocse._name === n.title );
				if ( ocse ) ses.push(ocse);
			}
		});

		for ( let i in ses) ses[i]._metaData.order = i;
		
		// console.log(ses);

		json.engines = ses;

		exportSearchJsonMozLz4(JSON.stringify(json));
		
	});
	
	function CS2FF(se) {

		let ff = {
			_name: se.title,
			_loadPath: "[other]addEngineWithDetails",
			description: se.title,
			__searchForm: se.searchForm,
			_iconURL: se.icon_base64String,
			_metaData: {
				alias: null,
				order: null
			},
			_urls: [
				{
					method: se.method,
					params: se.params,
					rels: [],
					template: se.template
				}
			],
			_isAppProvided: false,
			_orderHint: null,
			_telemetryId: null,
			_updateInterval: null,
			_updateURL: null,
			_iconUpdateURL: null,
			_filePath: null,
			_extensionID: null,
			_locale: null,
			_definedAliases: [],
			queryCharset: se.queryCharset.toLowerCase()
		}
		
		return ff;
	}
});

$('#nightmode').addEventListener('click', () => {
	userOptions.nightMode = !userOptions.nightMode;

	$('#style_dark').disabled = !userOptions.nightMode;
	saveOptions();
});

$('#s_quickMenuTheme').innerHTML = null;
themes.forEach( t => {
	let option = document.createElement('option');
	option.value = option.innerText = t.name;
	$('#s_quickMenuTheme').appendChild(option);
});

$('#b_cacheIcons').addEventListener('click', e => {
	cacheAllIcons(e);
});

$('#b_uncacheIcons').addEventListener('click', e => {
	if ( confirm('remove all icon cache?'))	uncacheIcons();
});

function cacheAllIcons(e) {
	let result = cacheIcons();
	let msg = document.createElement('div');
	msg.style = "margin:2px";
	msg.innerText = "cache progress";
	e.target.parentNode.insertBefore(msg, e.target.nextSibling);

	let interval = setInterval(() => {
		msg.innerText = `caching ${result.count - 1} / ${userOptions.searchEngines.length}`;
	}, 100);

	result.oncomplete = function() {
		clearInterval(interval);
		if ( result.bad.length )
			msg.innerText = "some icons could not be cached";
		else
			msg.innerText = "done";

		setTimeout(() => msg.parentNode.removeChild(msg), 5000);

		saveOptions();
	}

	result.cache();
}

function buildShortcutTable() {
	let table = $('#shortcutTable');

	setButtons = (el, key) => {
		el.innerText = null;
		el.appendChild(keyArrayToButtons(key));
	}

	defaultToUser = key => {
		return {
			alt: key.alt,
			shift: key.shift,
			ctrl: key.ctrl,
			meta: key.meta,
			key: key.key,
			id: key.id,
			enabled: key.enabled || false
		}
	}

	defaultShortcuts.sort((a,b) => a.name > b.name).forEach( s => {

		const us = userOptions.userShortcuts.find(_s => _s.id == s.id);
		const ds = defaultToUser(s);

		let tr = document.createElement('tr');
		tr.shortcut = s;
		tr.innerHTML = `
			<td></td>
			<td>${s.name || s.action}</td>
			<td><span style="cursor:pointer;user-select:none;" title="${browser.i18n.getMessage("ClickToSet")}" data-id="${s.id}">set</span></td>
			`;
		table.appendChild(tr);

		let input = document.createElement('input');
		input.type = "checkbox";
		input.checked = us ? us.enabled : false;

		input.onchange = () => {
			let key = userOptions.userShortcuts.find(_s => _s.id == s.id) || defaultToUser(s);
			key.enabled = input.checked;
			setUserShortcut(key);
		}

		tr.querySelector('td').appendChild(input);
		
		const b = tr.querySelector('span')
		setButtons(b, us || ds);

		b.onclick = async () => {

			let key = await shortcutListener(b);

			if ( !key )
				setUserShortcut(ds);
			else {
				key.id = ds.id;
				setUserShortcut(key);
			}

			setButtons(b, key || ds);
		}
	});

	function setUserShortcut(key) {
		if ( ! 'id' in key ) throw new Error('NO_ID');

		key = defaultToUser(key);

		let us = userOptions.userShortcuts.find( s => s.id == key.id);

		if ( us ) {
			key.enabled = us.enabled;
			userOptions.userShortcuts.splice(userOptions.userShortcuts.indexOf(us), 1, key);
		} else userOptions.userShortcuts.push(key);

		saveOptions();
	}
}

document.addEventListener('userOptionsLoaded', buildShortcutTable);

function shortcutListener(hk, options) {

	options = options || {};

	return new Promise(resolve => {
			
		preventDefaults = e => {
			e.preventDefault();
			e.stopPropagation();
		}

		document.addEventListener('keydown', preventDefaults);
		document.addEventListener('keypress', preventDefaults);
		
		hk.innerHTML = '<img src="/icons/spinner.svg" style="height:1em;margin-right:10px;vertical-align:middle" /> ';
		hk.appendChild(document.createTextNode(browser.i18n.getMessage('PressKey')));
				
		document.addEventListener('keyup', e => {
			
			e.preventDefault();
			e.stopPropagation();
			
			if ( e.key === "Escape" ) {
				hk.innerHTML = null;
				hk.appendChild(keyArrayToButtons(options.defaultKeys || []));
				resolve(null);
				return;
			}
			
			let key = {
				alt: e.altKey,
				ctrl: e.ctrlKey,
				meta: e.metaKey,
				shift: e.shiftKey,
				key: e.key
			}
			
			hk.innerHTML = null;
			hk.appendChild(keyArrayToButtons(key));
								
			document.removeEventListener('keydown', preventDefaults);
			document.removeEventListener('keypress', preventDefaults);

			resolve(key);
			
		}, {once: true});
	});	
}

// sort advanced
document.addEventListener('DOMContentLoaded', e => {
	let table = $('#advancedSettingsTable');
	let trs = table.querySelectorAll('tr');
	trs = [...trs].sort((a,b) => {
		return a.querySelector('td').innerText > b.querySelector('td').innerText ? 1 : -1;
	});
	table.innerHTML = null;
	trs.forEach( tr => table.appendChild(tr));
})


