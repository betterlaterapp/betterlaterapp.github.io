var TabsModule = (function () {
    var json;

    // Hamburger menu functions
    function openHamburgerMenu() {
        $('.hamburger-toggle').addClass('active');
        $('.hamburger-menu, .hamburger-overlay').addClass('show');
        $('body').css('overflow', 'hidden');
    }

    function closeHamburgerMenu() {
        $('.hamburger-toggle').removeClass('active');
        $('.hamburger-menu, .hamburger-overlay').removeClass('show');
        $('body').css('overflow', '');
    }

    function setupHamburgerMenu() {
        $(document).on('click', '.hamburger-toggle', function(e) {
            e.stopPropagation();
            if ($('.hamburger-menu').hasClass('show')) {
                closeHamburgerMenu();
            } else {
                openHamburgerMenu();
            }
        });

        $(document).on('click', '.hamburger-close, .hamburger-overlay, .hamburger-menu-item', function() {
            closeHamburgerMenu();
        });
    }

    /**
     * Switch to a tab pane and update active states
     */
    function switchToTab(tabId, callback) {
        // Hide all tab panes, show target
        $('.tab-pane').removeClass('active show');
        $('#' + tabId).addClass('active show');

        // Update toggler active states
        $('.statistics-tab-toggler, .settings-tab-toggler, .notifications-tab-toggler, .baseline-tab-toggler, .goals-tab-toggler, .reports-tab-toggler')
            .removeClass('active');

        // Save to storage
        json.option.activeTab = tabId;
        if (StorageModule.hasStorageData()) {
            var jsonObject = StorageModule.retrieveStorageObject();
            jsonObject.option.activeTab = tabId;
            StorageModule.setStorageObject(jsonObject);
        }

        if (callback) callback();
    }

    function returnToActiveTab() {
        if (json.option.activeTab) {
            var tabName = json.option.activeTab.split("-")[0];
            $("." + tabName + "-tab-toggler").click();
        } else {
            $(".statistics-tab-toggler").click();
        }
    }

    function setupStatisticsTabHandler(userWasInactive) {
        $(document).on('click', '.statistics-tab-toggler', function (e) {
            e.preventDefault();
            switchToTab('statistics-content', function() {
                setTimeout(function () {
                    UIModule.toggleActiveStatGroups(json);
                    UIModule.hideInactiveStatistics(json);
                    TimersModule.adjustFibonacciTimerToBoxes("goal-timer", userWasInactive);
                    TimersModule.adjustFibonacciTimerToBoxes("smoke-timer", userWasInactive);
                    TimersModule.adjustFibonacciTimerToBoxes("bought-timer", userWasInactive);
                }, 0);
                StatsDisplayModule.initiateReport(json);
            });
            $('.statistics-tab-toggler').addClass('active');
        });
    }

    function setupSettingsTabHandler() {
        $(document).on('click', '.settings-tab-toggler', function (e) {
            e.preventDefault();
            switchToTab('settings-content');
            $('.settings-tab-toggler').addClass('active');
        });
    }

    function setupNotificationsTabHandler() {
        $(document).on('click', '.notifications-tab-toggler', function (e) {
            e.preventDefault();
            switchToTab('notifications-content', function() {
                NotificationsModule.renderNotificationsLog();
            });
            $('.notifications-tab-toggler').addClass('active');
        });
    }

    function setupBaselineTabHandler() {
        $(document).on('click', '.baseline-tab-toggler', function (e) {
            e.preventDefault();
            switchToTab('settings-content', function() {
                setTimeout(function() {
                    var $baseline = $('.baseline-questionnaire-heading');
                    if ($baseline.length) {
                        $('html, body').animate({ scrollTop: $baseline.offset().top - 100 }, 200);
                    }
                }, 50);
            });
            $('.baseline-tab-toggler').addClass('active');
        });
    }

    function setupGoalsTabHandler() {
        $(document).on('click', '.goals-tab-toggler', function (e) {
            e.preventDefault();
            switchToTab('statistics-content', function() {
                setTimeout(function() {
                    var $goal = $('#goal-content');
                    if ($goal.length) {
                        $('html, body').animate({ scrollTop: $goal.offset().top - 100 }, 200);
                    }
                }, 50);
            });
            $('.goals-tab-toggler').addClass('active');
        });
    }

    function init(appJson, userWasInactive) {
        json = appJson;
        setupHamburgerMenu();
        setupStatisticsTabHandler(userWasInactive);
        setupSettingsTabHandler();
        setupNotificationsTabHandler();
        setupBaselineTabHandler();
        setupGoalsTabHandler();
    }

    return {
        returnToActiveTab: returnToActiveTab,
        switchToTab: switchToTab,
        init: init
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabsModule;
} else {
    window.TabsModule = TabsModule;
}
