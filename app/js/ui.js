var UIModule = (function() {
    // Private variables for module scope
    var json;

    function toggleActiveStatGroups(json) {
        // Loop through all stats and auto hide duplicate values inside of Total-Week-Month-Year style objects
        for (let statGroup in json.statistics) {
            for (let stat in json.statistics[statGroup]) {
                let statObj = json.statistics[statGroup][stat];

                let statIsTimer = stat == "untilTimerEnd" || stat == "sinceTimerStart";
                if (typeof statObj !== 'object' || statIsTimer) {
                    continue;
                }

                // Display only parts of the stat that matter
                // i.e. if total == week, then no need for total. Same goes for month == week.
                let i = 0;
                let allZeroValues = true;
                let timeRanges = Object.keys(statObj);
                var prevRange = "";
                for (let range of timeRanges) {
                    i++;
                    if (statObj[range] !== 0 && statObj[range] !== "N/A") {
                        allZeroValues = false;
                    } else {
                        $(".statistic." + statGroup + "." + stat + "." + range).parent().hide();
                        continue;
                    }

                    let nextKey = statObj[timeRanges[i]];
                    if (nextKey == statObj[range] || statObj[range] == "N/A") {
                        $(".statistic." + statGroup + "." + stat + "." + range).parent().hide();
                    } else if (nextKey == undefined) {
                        $(".statistic." + statGroup + "." + stat + "." + "week").parent().show();
                    }
                    
                    prevRange = range;
                }

                // Labels should hide if the whole stat is also hidden
                if (allZeroValues) {
                    $(".stat-group." + statGroup + "." + stat).parent().hide();
                } else {
                    $(".stat-group." + statGroup + "." + stat).parent().show();
                }
            }
        }
    }

    function hideInactiveStatistics(json) {
        var display = json.option.liveStatsToDisplay;
        var stat = json.statistics;

        // Used to hide instructions once app is in use
        var statisticPresent = false;
        
        // HIDE UNAVAILABLE STATS
        // Cost/bought stats
        if (stat.cost.clickCounter === 0) {
            $("#bought-total").hide();
            $("#cost-content .timer-recepticle").hide();
        } else {
            statisticPresent = true;
        }
        if (stat.cost.clickCounter < 2 || isNaN(stat.cost.betweenClicks.total)) {
            $("#cost-content .betweenClicks.cost.week.statistic").parent().parent().parent().hide();
        }
        if (isNaN(stat.cost.betweenClicks.week)) {
            $("#cost-content .betweenClicks.cost.week.statistic").hide();
        }
        if (isNaN(stat.cost.betweenClicks.month)) {
            $("#cost-content .betweenClicks.cost.month.statistic").hide();
        }
        if (isNaN(stat.cost.betweenClicks.year)) {
            $("#cost-content .betweenClicks.cost.year.statistic").hide();
        }

        // Usage stats
        if (stat.use.clickCounter === 0) {
            $("#use-total").hide();
            $("#use-content .timer-recepticle").hide();
            $("#use-content .statistic.use.totals.total").parent().parent().parent().hide();
        } else {
            statisticPresent = true;
        }

        if (stat.use.clickCounter < 2 || isNaN(stat.use.betweenClicks.total)) {
            $("#use-content .betweenClicks.use.week.statistic").parent().parent().parent().hide();
        }
        if (isNaN(stat.use.betweenClicks.week)) {
            $("#use-content .betweenClicks.use.week.statistic").hide();
        }
        if (isNaN(stat.use.betweenClicks.month)) {
            $("#use-content .betweenClicks.use.month.statistic").hide();
        }
        if (isNaN(stat.use.betweenClicks.year)) {
            $("#use-content .betweenClicks.use.year.statistic").hide();
        }
        
        // Cravings stats
        if (stat.use.craveCounter === 0) {
            $("#crave-total").hide();
        } else {
            statisticPresent = true;
        }
        if (stat.use.craveCounter === 0 || stat.use.clickCounter === 0) {
            $(".didntPerDid.stat-group").parent().hide();
        }
        if (stat.use.cravingsInARow === 0 || stat.use.cravingsInARow === 1) {
            $("#cravingsResistedInARow").parent().hide();
        }

        // Goal stats
        if (stat.goal.clickCounter === 0) {
            $("#goal-content .timer-recepticle").hide();
        } else {
            statisticPresent = true;
        }
        if (stat.goal.longestGoal.total === 0) {
            $(".stat-group.longestGoal").parent().hide();
        }
        if (stat.goal.completedGoals === 0) {
            $("#numberOfGoalsCompleted").parent().hide();
        }
        if (statisticPresent) {
            $("#statistics-content .initial-instructions").hide();
        }

        /* HIDE UNWANTED STATISTICS BASED ON USER PREFERENCES */
        // COST
        if (!display.boughtGoalButton) {
            $("#boughtGoalInput").parent().hide();
        }
        if (!display.sinceLastSpent) {
            $("#cost-content .timer-recepticle").hide();
        }
        if (!display.avgBetweenSpent) {
            $(".statistic.cost.betweenClicks.total").parent().parent().parent().hide();
        }
        if (!display.totalSpent) {
            $(".statistic.cost.totals.total").parent().parent().parent().hide();
        }

        // USE
        if (!display.timesDone) {
            $(".statistic.use.totals.total").parent().parent().parent().hide();
        }
        if (!display.sinceLastDone) {
            $("#use-content .timer-recepticle").hide();
        }
        if (!display.avgBetweenDone) {
            $("#use-content .betweenClicks").parent().hide();
        }
        if (!display.didntPerDid) {
            $(".didntPerDid.stat-group").parent().hide();
        }
        if (!display.resistedInARow) {
            $(".stat-group.resistStreak").parent().hide();
        }
        if (!display.timesDone) {
            $(".stat-group .statistic.use.totals.total").parent().parent().parent().hide();
        }

        // MOOD TRACKER 
        if (!json.option.logItemsToDisplay.mood) {
            $("#mood-tracker-heading").hide();
            $("#mood-tracker-area").hide();
        }

        // BUTTONS
        if (!display.spentButton) {
            $("#bought-button").parent().hide();
        }
        if (!display.usedButton) {
            $("#use-button").parent().hide();
        }
        if (!display.cravedButton) {
            $("#crave-button").parent().hide();
        }
        if (!display.longestGoal) {
            $("#goal-content .longestGoal").parent().hide();
        }
        if (!display.untilGoalEnd) {
            $("#goal-content .timer-recepticle").hide();
        }
    }

    function showActiveStatistics(json) {
        var display = json.option.liveStatsToDisplay;
        var stat = json.statistics;
        
        // Show Buttons if requested
        if (display.spentButton) {
            $("#bought-button").parent().show();
        }
        if (display.boughtGoalButton) {
            $("#boughtGoalInput").parent().hide();
        }
        if (display.usedButton) {
            $("#use-button").parent().show();
        }
        if (display.usedGoalButton) {
            $("#usedGoalInput").parent().hide();
        }
        if (display.cravedButton) {
            $("#crave-button").parent().show();
        }
        if (display.goalButton) {
            $("#goal-button").parent().show();
        }

        if (display.timesDone && stat.use.clickCounter > 5) {
            $(".statistic.use.totals.total").parent().parent().parent().show();
        } 
        
        // Bought page 
        if (display.sinceLastSpent && stat.cost.clickCounter !== 0) {
            $("#bought-total").show();
            $("#cost-content .timer-recepticle").show();
            $("#cost-content .fibonacci-timer").show();
        }

        if (display.avgBetweenSpent && stat.cost.betweenClicks.total !== 0) {
            $("#cost-content .betweenClicks").parent().show();
            StatsDisplayModule.recalculateAverageTimeBetween("cost", "total", json);
            
            if (stat.cost.betweenClicks.week !== 0) {
                $("#cost-content .betweenClicks.week.statistic").show();
                StatsDisplayModule.recalculateAverageTimeBetween("cost", "week", json);
            }
            if (stat.cost.betweenClicks.month !== 0) {
                $("#cost-content .betweenClicks.month.statistic").show();
                StatsDisplayModule.recalculateAverageTimeBetween("cost", "month", json);
            }
            if (stat.cost.betweenClicks.year !== 0) {
                $("#cost-content .betweenClicks.year.statistic").show();
                StatsDisplayModule.recalculateAverageTimeBetween("cost", "year", json);
            }
        }

        if (display.totalSpent && stat.cost.totals.total !== 0) {
            $("#cost-content .stat-recepticle").show();
            $(".statistic.cost.totals.total").parent().show();
        }
        
        if (display.sinceLastDone && stat.use.clickCounter !== 0) {
            $("#use-total").show();
            $("#use-content .timer-recepticle").show();
            $("#use-content .fibonacci-timer").show();
        }

        if (display.avgBetweenDone && stat.use.betweenClicks.total !== 0) {
            $("#use-content .betweenClicks").parent().show();
            StatsDisplayModule.recalculateAverageTimeBetween("use", "total", json);
            
            if (stat.use.betweenClicks.week !== 0) {
                $("#use-content .betweenClicks.week.statistic").show();
                StatsDisplayModule.recalculateAverageTimeBetween("use", "week", json);
            }
            if (stat.use.betweenClicks.month !== 0) {
                $("#use-content .betweenClicks.month.statistic").show();
                StatsDisplayModule.recalculateAverageTimeBetween("use", "month", json);
            }
            if (stat.use.betweenClicks.year !== 0) {
                $("#use-content .betweenClicks.year.statistic").show();
                StatsDisplayModule.recalculateAverageTimeBetween("use", "year", json);
            }
        }
        
        if (stat.use.craveCounter !== 0) {
            $("#crave-total").show();
        }
        
        if (display.didntPerDid && stat.use.craveCounter !== 0 && stat.use.clickCounter !== 0) {
            $(".didntPerDid.stat-group").parent().show();
        }
        
        if (display.resistedInARow && stat.use.cravingsInARow !== 0) {
            $("#cravingsResistedInARow").parent().show();
        }

        // Goal page
        if (display.untilGoalEnd && stat.goal.clickCounter !== 0 && stat.goal.untilTimerEnd.totalSeconds !== 0 &&
            (stat.goal.activeGoalBoth || stat.goal.activeGoalBought || stat.goal.activeGoalUse)
        ) {
            $("#goal-content .timer-recepticle").show();
            $("#goal-content .fibonacci-timer").show();
        }

        var bestTime = stat.goal.longestGoal;
        if (display.longestGoal && bestTime.total !== 0) {
            $(".stat-group.longestGoal").parent().show();

            if (bestTime.week !== "N/A") {
                $(".longestGoal.week.statistic").show();
                StatsDisplayModule.displayLongestGoal("week", json);
            }
            if (bestTime.month !== bestTime.week && bestTime.month !== "N/A") {
                $(".longestGoal.month.statistic").show();
                StatsDisplayModule.displayLongestGoal("month", json);
            }
            if (bestTime.year !== bestTime.month && bestTime.year !== "N/A") {
                $(".longestGoal.year.statistic").show();
                StatsDisplayModule.displayLongestGoal("year", json);
            }
        }
        
        if (stat.goal.completedGoals !== 0) {
            $("#numberOfGoalsCompleted").parent().show();
        }

        if (json.option.logItemsToDisplay.mood) {
            $("#mood-tracker-heading").show();
            $("#mood-tracker-area").show();
        }
    }

    function shootConfetti() {
        const duration = 2 * 1000,
            animationEnd = Date.now() + duration,
            defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 40 * (timeLeft / duration);

            // Since particles fall down, start a bit higher than random
            confetti(
                Object.assign({}, defaults, {
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                })
            );
            confetti(
                Object.assign({}, defaults, {
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                })
            );
        }, 250);
    }

    /**
     * Hide zero value timer boxes
     * @param {string} timerSection - The timer section ID
     */
    function hideZeroValueTimerBoxes(timerSection) {
        // Make boxes with value of zero hidden until find a non zero value
        for (var i = 0; i < $("#" + timerSection + " .boxes div").length; i++) {
            var currTimerSpanValue = $("#" + timerSection + " .boxes div .timerSpan")[i];
            if (currTimerSpanValue.innerHTML == "0") {
                $(currTimerSpanValue).parent().hide();
            } else {
                break;
            }
        }
    }

    /**
     * Open click dialog
     * @param {string} clickDialogTarget - The dialog target selector
     */
    function openClickDialog(clickDialogTarget) {
        var navBarHeight = 62;

        $(clickDialogTarget + ".log-more-info").slideToggle("fast");

        $('html, body').animate({
            scrollTop: $('.log-more-info').offset().top - navBarHeight
        }, 1500);
        
        // Grey out background
        var bodyHeight = $(document).height();
        $("#greyed-out-div").height(bodyHeight);
        $("#greyed-out-div").css("z-index", "10");
        $("#greyed-out-div").animate({ opacity: 0.7 }, 300);
        $("#greyed-out-div").click(function () {
            if ($("#greyed-out-div").height() > 0) {
                if (confirm("Are you sure you want to close out of this dialog? No action will be recorded.")) {
                    closeClickDialog(clickDialogTarget);
                }
            }
        });
    }

    /**
     * Close click dialog
     * @param {string} clickDialogTarget - The dialog target selector
     */
    function closeClickDialog(clickDialogTarget) {
        $("#greyed-out-div").animate({ opacity: 0 }, 200);
        $("#greyed-out-div").css("z-index", "0");
        $("#greyed-out-div").height(0);
        $("#greyed-out-div").off("click");

        $(clickDialogTarget + ".log-more-info").slideToggle("fast");
    }

    /**
     * Setup time picker notification for yesterday's time
     * Notifies user when requested times are for yesterday
     */
    function setupTimePickerNotification() {
        $(".use.log-more-info").find(".time-picker-minute, .time-picker-hour, .time-picker-am-pm, .form-check-input").on('change', function(event) {
            let minute = event.target.classList.contains("time-picker-minute");
            let hour = event.target.classList.contains("time-picker-hour");
            let ampm = event.target.classList.contains("time-picker-am-pm");

            if ((minute || hour || ampm) && !$('#pastTimeUseRadio').is(":checked")) {
                $('#pastTimeUseRadio').prop("checked", true);
            }
            
            var date = new Date();
            var currMinutes = date.getHours() * 60 + date.getMinutes();
            var reqHours = parseInt($(".use.log-more-info .time-picker-hour").val());
            var reqMinutes = parseInt($(".use.log-more-info .time-picker-minute").val());

            // Compensate for non-military time
            if ($(".use.log-more-info .time-picker-am-pm").val() == "PM") {
                reqHours = reqHours + 12;
            }
            // Total requested minutes
            reqMinutes += reqHours * 60;

            var reqTimeInFuture = reqMinutes > currMinutes;
            if (reqTimeInFuture && $('#pastTimeUseRadio').is(":checked")) {
                $('.24-hour-day-indicator').show();
            } else {
                $('.24-hour-day-indicator').hide();
            }
        });
    }

    /**
     * Initialize the module with app state
     * @param {Object} appJson - The application JSON object
     */
    function init(appJson) {
        json = appJson || json;

        // Setup time picker notification
        setupTimePickerNotification();
    }

    // Public API
    return {
        toggleActiveStatGroups: toggleActiveStatGroups,
        hideInactiveStatistics: hideInactiveStatistics,
        showActiveStatistics: showActiveStatistics,
        shootConfetti: shootConfetti,
        hideZeroValueTimerBoxes: hideZeroValueTimerBoxes,
        openClickDialog: openClickDialog,
        closeClickDialog: closeClickDialog,
        setupTimePickerNotification: setupTimePickerNotification,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIModule;
} else {
    window.UIModule = UIModule;
}
