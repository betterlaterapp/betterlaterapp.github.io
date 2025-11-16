var TabsModule = (function () {
    // Private variables
    var json;

    function returnToActiveTab() {
        if (json.option.activeTab) {
            var tabName = json.option.activeTab.split("-")[0];
            $("." + tabName + "-tab-toggler").click();
        } else {
            $("." + "statistics" + "-tab-toggler").click();
        }
    }

    function saveActiveTab() {
        //update instance json
        json.option.activeTab = $(".tab-pane.active").attr('id');

        //update in option table
        var jsonObject = StorageModule.retrieveStorageObject();
        jsonObject.option.activeTab = $(".tab-pane.active").attr('id');
        StorageModule.setStorageObject(jsonObject);
    }

    function setupStatisticsTabHandler(userWasInactive) {
        $(document).delegate(".statistics-tab-toggler", 'click', function (e) {
            saveActiveTab();

            setTimeout(function () {
                UIModule.toggleActiveStatGroups(json);
                UIModule.hideInactiveStatistics(json);

                TimersModule.adjustFibonacciTimerToBoxes("goal-timer", userWasInactive);
                TimersModule.adjustFibonacciTimerToBoxes("smoke-timer", userWasInactive);
                TimersModule.adjustFibonacciTimerToBoxes("bought-timer", userWasInactive);

            }, 0);

            $(".baseline-tab-toggler").removeClass("active");
            $(".settings-tab-toggler").removeClass("active");
            $(".reports-tab-toggler").removeClass("active");

            if ($('#settings-content').hasClass("active")) {
                $('#settings-content').removeClass("active")
                $('#settings-content').attr("aria-expanded", false)
            }

            $(".statistics-tab-toggler").addClass("active");

            //close dropdown nav
            if ($("#options-collapse-menu").hasClass("show")) {
                $(".navbar-toggler").click();
            }

            //get them notifcations for useful reports
            StatisticsModule.initiateReport(json);
        });
    }

    function setupSettingsTabHandler() {
        $(document).delegate(".settings-tab-toggler", 'click', function (e) {

            saveActiveTab();
            $(".baseline-tab-toggler").removeClass("active");
            $(".reports-tab-toggler").removeClass("active");
            $(".statistics-tab-toggler").removeClass("active");

            $(this).addClass('active')

            //close dropdown nav
            if ($("#options-collapse-menu").hasClass("show")) {
                $(".navbar-toggler").click();
            }

        });
    }

    /**
     * Initialize the tabs module
     * @param {Object} appJson - The application JSON object
     * @param {boolean} userWasInactive - Whether user was inactive
     */
    function init(appJson, userWasInactive) {
        json = appJson;

        setupStatisticsTabHandler(userWasInactive);
        setupSettingsTabHandler();
    }

    // Public API
    return {
        returnToActiveTab: returnToActiveTab,
        saveActiveTab: saveActiveTab,
        setupStatisticsTabHandler: setupStatisticsTabHandler,
        setupSettingsTabHandler: setupSettingsTabHandler,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabsModule;
} else {
    window.TabsModule = TabsModule;
}


