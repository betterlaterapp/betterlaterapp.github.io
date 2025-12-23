var StatisticsModule = (function () {
    /**
     * Calculate statistics for different time ranges
     * @param {number} timeNow - Current timestamp
     * @param {Array} action - Array of actions
     * @param {string} value - Optional value field to sum
     * @returns {Object} - Object with total, week, month, and year values
     */
    function segregatedTimeRange(timeNow, action, value) {
        var runningTotal = 0,
            runningWeek = 0,
            runningMonth = 0,
            runningYear = 0;

        // Calculate timestamps for past week, month, year
        var oneWeekAgoTimeStamp = timeNow - (60 * 60 * 24 * 7);
        var oneMonthAgoTimeStamp = timeNow - (60 * 60 * 24 * 30);
        var oneYearAgoTimeStamp = timeNow - (60 * 60 * 24 * 365);

        for (var i = action.length - 1; i >= 0; i--) {
            // Update every record into running total
            runningTotal = runningTotal + parseInt(value != undefined ? action[i][value] : 1);

            if (action[i].timestamp > oneWeekAgoTimeStamp) {
                runningWeek = runningWeek + parseInt(value != undefined ? action[i][value] : 1);
            }
            if (action[i].timestamp > oneMonthAgoTimeStamp) {
                runningMonth = runningMonth + parseInt(value != undefined ? action[i][value] : 1);
            }
            if (action[i].timestamp > oneYearAgoTimeStamp) {
                runningYear = runningYear + parseInt(value != undefined ? action[i][value] : 1);
            }
        }

        return {
            total: runningTotal,
            week: runningWeek,
            month: runningMonth,
            year: runningYear
        };
    }

    /**
     * Get midnight timestamp of a given timestamp
     * @param {number} timestamp - The timestamp to convert
     * @returns {number} - Timestamp for midnight of that day
     */
    function midnightOfTimestamp(timestamp) {
        var requestedDate = new Date(timestamp * 1000);

        // FORMAT NEEDED == 2020-02-14T14:30:00
        var newMidnightStr = requestedDate.getFullYear() + "-";
        // Add month
        if (requestedDate.getMonth() + 1 < 10) {
            newMidnightStr += "0" + (requestedDate.getMonth() + 1) + "-";
        } else {
            newMidnightStr += (requestedDate.getMonth() + 1) + "-";
        }
        // Add day
        if (requestedDate.getDate() < 10) {
            newMidnightStr += "0" + (requestedDate.getDate());
        } else {
            newMidnightStr += (requestedDate.getDate());
        }
        // Add hours
        newMidnightStr += "T23:59:59";

        var midnightOfTimestamp = Math.round(new Date(newMidnightStr) / 1000);
        return midnightOfTimestamp;
    }

    /**
     * Calculate the maximum report height based on actions
     * @param {Object} storageObject - The storage object
     * @returns {number} - Maximum report height
     */
    function calculateMaxReportHeight(storageObject) {
        var jsonObject = storageObject ? storageObject : StorageModule.retrieveStorageObject();
        var actions = jsonObject.action.filter(function (e) {
            return e.clickType == "used" || e.clickType == "craved";
        });

        var maxHeight = 0;
        var actionCount = 0;
        var currDate = new Date();
        for (var action of actions) {
            var actionDate = new Date(action.timestamp * 1000);
            var actionYear = actionDate.getFullYear();
            var actionMonth = actionDate.getMonth();
            var actionDay = actionDate.getDate();

            var actionOnCurrDate =
                actionYear == currDate.getFullYear()
                && actionMonth == currDate.getMonth()
                && actionDay == currDate.getDate();

            if (actionOnCurrDate) {
                actionCount++;
                if (actionCount > maxHeight) {
                    maxHeight = actionCount;
                }
            } else {
                currDate = actionDate;
                actionCount = 1;
            }
        }

        return maxHeight;
    }

    /**
     * Create object of week values from the end date timestamp
     * @param {number} reportEndStamp - Report end timestamp
     * @param {Object} json - App state object
     * @returns {Object} - Values object for report
     */
    function calculateReportValues(reportEndStamp, json) {
        var valuesObject = {
            "reportStart": -1,
            "reportEnd": -1,
            "used": {
                "weekValues": [0, 0, 0, 0, 0, 0, 0],
                "total": 0,
                "lastWeek": 0
            },
            "craved": {
                "weekValues": [0, 0, 0, 0, 0, 0, 0],
                "total": 0,
                "lastWeek": 0
            },
            "bought": {
                "weekValues": [0, 0, 0, 0, 0, 0, 0],
                "total": 0,
                "lastWeek": 0
            }
        };

        var jsonObject = StorageModule.retrieveStorageObject();

        // Build new date as midnight of requested date
        var midnightLastDay = midnightOfTimestamp(reportEndStamp);

        // Start one week prior to end stamp
        var reportStartStamp = midnightLastDay - (60 * 60 * 24 * 7);
        var lastWeekStartStamp = reportStartStamp - (60 * 60 * 24 * 7);

        // Update report valuesObject
        valuesObject.reportStart = reportStartStamp;
        valuesObject.reportEnd = midnightLastDay;
        // To make the "previous report" arrow button workable
        json.report.activeEndStamp = midnightLastDay;

        var boughtThisWeek = jsonObject.action.filter(function (e) {
            return (e.clickType == "bought")
                && e.timestamp >= reportStartStamp
                && e.timestamp <= midnightLastDay;
        });

        var didLastWeek = jsonObject.action.filter(function (e) {
            return (e.clickType == "used" || e.clickType == "craved")
                && e.timestamp >= lastWeekStartStamp
                && e.timestamp < reportStartStamp;  // Use < to avoid double-counting at boundary
        });

        var boughtLastWeek = jsonObject.action.filter(function (e) {
            return (e.clickType == "bought")
                && e.timestamp >= lastWeekStartStamp
                && e.timestamp < reportStartStamp;  // Use < to avoid double-counting at boundary
        });

        for (var dayIndex = 0; dayIndex < 7; dayIndex++) {
            var startOfDayTimestamp = reportStartStamp + ((60 * 60 * 24) * dayIndex);
            var endOfDayTimestamp = reportStartStamp + ((60 * 60 * 24) * (dayIndex + 1));

            var actionsInRange = jsonObject.action.filter(function (e) {
                return (e.clickType == "used" || e.clickType == "craved")
                    && e.timestamp >= startOfDayTimestamp
                    && e.timestamp <= endOfDayTimestamp;
            });

            // Sort actions into valuesObject
            for (var action of actionsInRange) {
                // Insert action into array at day index
                valuesObject[action.clickType].weekValues[dayIndex]++;
                valuesObject[action.clickType].total++;
            }
        }

        if (boughtThisWeek.length > 0) {
            for (var action of boughtThisWeek) {
                valuesObject[action.clickType].total += parseFloat(action.spent);
            }
        }

        if (didLastWeek.length > 0) {
            for (var action of didLastWeek) {
                valuesObject[action.clickType].lastWeek++;
            }
        }

        if (boughtLastWeek.length > 0) {
            for (var action of boughtLastWeek) {
                valuesObject[action.clickType].lastWeek += parseFloat(action.spent);
            }
        }

        return valuesObject;
    }

    /**
     * Initiate the weekly report
     * @param {Object} json - App state object
     * @returns {boolean} - Whether the report was initiated
     */
    function initiateReport(json) {
        if (!json.option.reportItemsToDisplay.useVsResistsGraph) {
            return false;
        }

        var jsonObject = StorageModule.retrieveStorageObject();
        var timeNow = Math.round(new Date() / 1000);

        json.report.maxHeight = calculateMaxReportHeight(jsonObject);

        // REPORTS!!!
        // Is there ANY data??
        if (!jsonObject["action"].length) {
            return false;
        }

        // Calculate values for report
        var reportEndStamp = timeNow;
        // As long as latest endStamp is < a week before the most recent timestamp taken,
        // Add a week - to find interval of 7 since FIRST stamp    
        while (reportEndStamp <= (timeNow - (60 * 60 * 24 * 7))) {
            // Add a week 
            reportEndStamp = parseInt(reportEndStamp) + (60 * 60 * 24 * 7);
        }

        // Define parameters for report ranges
        var firstStamp = jsonObject.action[0].timestamp;
        json.report.minEndStamp = parseInt(firstStamp);
        json.report.maxEndStamp = parseInt(reportEndStamp) + (60 * 60 * 24 * 7);

        // Show most recent report
        createReport(calculateReportValues(reportEndStamp, json), json);

        // Hide report description
        $(".weekly-report-description").hide();

        return true;
    }

    /**
     * Calculate percent change between two values
     * @param {number} first - First value (baseline/last week)
     * @param {number} second - Second value (this week)
     * @returns {number|string} - Percent change or "N/A"
     */
    function percentChangedBetween(first, second) {
        // Parse to numbers to handle string values from baseline
        first = parseFloat(first) || 0;
        second = parseFloat(second) || 0;

        // Both zero = no change
        if (first === 0 && second === 0) {
            return 0;
        }

        // Baseline is zero but we have activity = can't calculate meaningful %
        if (first === 0 && second !== 0) {
            return "N/A";
        }

        // Normal calculation
        var percentChanged = Math.round(((first - second) / first) * 100);
        
        // Safety check for any edge cases
        if (!isFinite(percentChanged) || isNaN(percentChanged)) {
            return "N/A";
        }

        return percentChanged;
    }

    /**
     * Format percent changed statistic for display
     * @param {Object} statTarget - jQuery object for the stat target
     * @param {number} percentChanged - Percent change value
     * @returns {string} - Formatted percent change string
     */
    function formatPercentChangedStat(statTarget, percentChanged) {
        // Assign correct colors and caret if percent change is neg/pos
        statTarget.parent().removeClass("down").removeClass("up");

        if (percentChanged < 0) {
            // Color
            statTarget.parent().addClass("up");
            // Icon
            statTarget.parent().find("i.fas").remove();
            statTarget.parent().prepend('<i class="fas fa-caret-up"></i>');
            // Remove minus sign
            percentChanged *= -1;
        } else {
            // Color
            statTarget.parent().addClass("down");
            // Icon
            statTarget.parent().find("i.fas").remove();
            statTarget.parent().prepend('<i class="fas fa-caret-down"></i>');
        }

        // Format string
        if (percentChanged.toString().length == 1) {
            percentChanged = "&nbsp;&nbsp;&nbsp;&nbsp;" + percentChanged + "%";
        } else if (percentChanged.toString().length == 2) {
            percentChanged = "&nbsp;&nbsp;" + percentChanged + "%";
        } else {
            percentChanged = percentChanged + "%";
        }

        return percentChanged;
    }

    /**
     * Convert timestamp to short hand date format
     * @param {number} timestamp - Timestamp to convert
     * @param {boolean} includeYear - Whether to include the year
     * @returns {string} - Formatted date string
     */
    function timestampToShortHandDate(timestamp, includeYear) {
        var endDateObj = new Date(parseInt(timestamp + "000"));
        var shortHandDate = (endDateObj.getMonth() + 1) + "/" +
            endDateObj.getDate();
        if (includeYear) {
            var year = String(endDateObj.getFullYear()).substring(2);
            shortHandDate = shortHandDate + "/" + year;
        }
        return shortHandDate;
    }

    /**
     * Convert seconds to formatted date string
     * @param {number} rangeInSeconds - Range in seconds to format
     * @param {boolean} multiline - Whether to use multiline format
     * @returns {string} - Formatted date string
     */
    function convertSecondsToDateFormat(rangeInSeconds, multiline) {
        // Seconds
        var currSeconds = rangeInSeconds % 60;
        if (currSeconds < 10) { currSeconds = "0" + currSeconds; }

        var finalStringStatistic = currSeconds + "s";

        // Minutes
        if (rangeInSeconds >= (60)) {
            var currMinutes = Math.floor(rangeInSeconds / (60)) % 60;
            if (currMinutes < 10) { currMinutes = "0" + currMinutes; }

            finalStringStatistic = currMinutes + "<span>m&nbsp;</span>" + finalStringStatistic;
        }

        // Hours
        if (rangeInSeconds >= (60 * 60)) {
            var currHours = Math.floor(rangeInSeconds / (60 * 60)) % 24;
            if (currHours < 10) { currHours = "0" + currHours; }

            finalStringStatistic = currHours + "<span>h&nbsp;</span>" + finalStringStatistic;
            // Drop seconds
            finalStringStatistic = finalStringStatistic.split("m")[0] + "m</span>";
        }

        // Days
        if (rangeInSeconds >= (60 * 60 * 24)) {
            var dayCount = Math.floor(rangeInSeconds / (60 * 60 * 24));
            var plural = "";
            if (dayCount > 1) {
                plural = "s";
            }
            var newline = "";
            if (multiline) {
                newline = "<br/>";
            }
            finalStringStatistic = dayCount + "<span>&nbsp;day" + plural + "&nbsp;</span>" + newline + finalStringStatistic;
            // Drop minutes
            finalStringStatistic = finalStringStatistic.split("h")[0] + "h</span>";
        }

        // Remove very first 0 from string
        if (finalStringStatistic.charAt(0) === "0") {
            finalStringStatistic = finalStringStatistic.substr(1);
        }

        return finalStringStatistic;
    }

    /**
     * Display average time between actions
     * @param {string} actionType - Action type (cost, use)
     * @param {string} timeIncrement - Time increment (total, week, month, year)
     * @param {Object} json - App state object
     * @param {Function} convertSecondsToDateFormat - Function to format seconds
     */
    function displayAverageTimeBetween(actionType, timeIncrement, json, convertSecondsToDateFormat) {
        var htmlDestination = "." + actionType + ".betweenClicks." + timeIncrement;

        var finalStringStats = {
            total: json.statistics[actionType].betweenClicks["total"],
            week: json.statistics[actionType].betweenClicks["week"],
            month: json.statistics[actionType].betweenClicks["month"],
            year: json.statistics[actionType].betweenClicks["year"]
        };

        // Insert HTML into span place holder
        for (const [key, value] of Object.entries(finalStringStats)) {
            var reasonableNumber = !isNaN(finalStringStats[key]) && isFinite(finalStringStats[key]);

            if (key == timeIncrement && reasonableNumber) {
                $(htmlDestination).html(
                    convertSecondsToDateFormat(finalStringStats[key], true)
                );
            }
        }
    }

    /**
     * Recalculate average time between actions
     * @param {string} actionType - Action type (cost, use)
     * @param {string} timeIncrement - Time increment (total, week, month, year)
     * @param {Object} json - App state object
     */
    function recalculateAverageTimeBetween(actionType, timeIncrement, json) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var timeNow = Math.round(new Date() / 1000);

        var timestampLength = {
            total: timeNow - json.statistics[actionType].firstClickStamp,
            week: 7 * 24 * 60 * 60,
            month: 30 * 24 * 60 * 60,
            year: 365 * 24 * 60 * 60
        };

        var actionGerund = "used";
        if (actionType == "cost") {
            actionGerund = "bought";
        }

        // Total uses
        var count = jsonObject.action.filter(function (e) {
            return e.clickType == actionGerund;
        });
        count = count.sort((a, b) => {
            return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
        });

        var countByIncrement = count.filter(function (e) {
            return e.timestamp >= timeNow - timestampLength[timeIncrement];
        });

        if (countByIncrement.length > 1) {
            var timeBetween = countByIncrement[countByIncrement.length - 1].timestamp - countByIncrement[0].timestamp;
            if (timestampLength.total > timestampLength[timeIncrement]) {
                timeBetween = timestampLength[timeIncrement];
            }
            var avgTimeBetween = Math.round(timeBetween / (countByIncrement.length - 1));

            if (json.statistics[actionType].betweenClicks[timeIncrement] != 0 && avgTimeBetween != 0) {
                json.statistics[actionType].betweenClicks[timeIncrement] = avgTimeBetween;
            }
        } else if (countByIncrement.length > 0) {
            var maxPossibleTime = timeNow - countByIncrement[0].timestamp;
            if (json.statistics[actionType].betweenClicks[timeIncrement] != 0 && maxPossibleTime != 0) {
                json.statistics[actionType].betweenClicks[timeIncrement] = maxPossibleTime;
            }
        }

        // Call function to display new stat
        displayAverageTimeBetween(actionType, timeIncrement, json, convertSecondsToDateFormat);
    }

    /**
     * Display longest goal
     * @param {string} timeIncrement - Time increment (total, week, month, year)
     * @param {Object} json - App state object
     * @param {Function} convertSecondsToDateFormat - Function to format seconds
     */
    function displayLongestGoal(timeIncrement, json, convertSecondsToDateFormat) {
        var longestGoal = json.statistics.goal.longestGoal;
        if (longestGoal[timeIncrement] !== 0 && longestGoal[timeIncrement] !== "N/A") {
            var html = convertSecondsToDateFormat(json.statistics.goal.longestGoal[timeIncrement], true);
            $(".statistic.longestGoal." + timeIncrement).html(html);
        }
    }

    /**
     * Create weekly report
     * @param {Object} reportValues - Report values
     * @param {Object} json - App state object
     */
    function createReport(reportValues, json) {
        // Remove d-none from report template
        if ($($(".weekly-report")[0]).hasClass("d-none")) {
            $($(".weekly-report")[0]).removeClass("d-none");
        }

        // Split object passed in to individual values
        var reportStart = reportValues.reportStart,
            reportEnd = reportValues.reportEnd,
            usesWeek = reportValues.used.weekValues,
            cravesWeek = reportValues.craved.weekValues,
            spentWeek = reportValues.bought.weekValues,
            usesLastWeek = reportValues.used.lastWeek,
            costLastWeek = reportValues.bought.lastWeek,
            totalUsesThisWeek = reportValues.used.total,
            totalCostThisWeek = reportValues.bought.total;

        // Set start date
        $("#reportStartDate").html(timestampToShortHandDate(reportStart, true));
        // Set end date
        $("#reportEndDate").html(timestampToShortHandDate(reportEnd, true));

        // Set bar chart values
        var dayLabels = [];
        for (var i = 1; i <= 7; i++) {
            dayLabels.push(timestampToShortHandDate((reportStart + (60 * 60 * 24 * i)), false));
        }

        // Initialize bar chart
        var data = {
            labels: dayLabels,
            series: [
                cravesWeek,
                usesWeek
            ]
        };

        var options = {
            high: json.report.maxHeight > 4 ? json.report.maxHeight : 4,
            seriesBarDistance: 10
        };

        var responsiveOptions = [
            ['screen and (max-width: 640px)', {
                seriesBarDistance: 10
            }]
        ];

        new Chartist.Bar('.ct-chart', data, options, responsiveOptions);

        // Set uses vs last week
        if (json.option.reportItemsToDisplay.useChangeVsLastWeek) {
            var percentChanged = percentChangedBetween(usesLastWeek, totalUsesThisWeek);
            if (percentChanged === "N/A") {
                $("#useChangeVsLastWeek").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#useChangeVsLastWeek"), percentChanged);
                $("#useChangeVsLastWeek").html(finishedStat);
            }
        } else {
            $("#useChangeVsLastWeek").parent().parent().hide();
        }

        var weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo = weekAgo.getTime();
        var beenAWeek = weekAgo / 1000 > parseInt(json.statistics.use.firstClickStamp);

        // Set uses vs baseline
        if (json.option.reportItemsToDisplay.useChangeVsBaseline && beenAWeek) {
            var percentChanged = percentChangedBetween(json.baseline.amountDonePerWeek, totalUsesThisWeek);
            if (percentChanged === "N/A") {
                $("#useChangeVsBaseline").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#useChangeVsBaseline"), percentChanged);
                $("#useChangeVsBaseline").html(finishedStat);
            }
        } else {
            $("#useChangeVsBaseline").parent().parent().hide();
        }

        // Set spent vs last week
        if (json.option.reportItemsToDisplay.costChangeVsLastWeek) {
            var percentChanged = percentChangedBetween(costLastWeek, totalCostThisWeek);
            if (percentChanged === "N/A") {
                $("#costChangeVsLastWeek").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#costChangeVsLastWeek"), percentChanged);
                $("#costChangeVsLastWeek").html(finishedStat);
            }
        } else {
            $("#costChangeVsLastWeek").parent().parent().hide();
        }

        // Set spent vs baseline
        if (json.option.reportItemsToDisplay.costChangeVsBaseline) {
            var percentChanged = percentChangedBetween(json.baseline.amountSpentPerWeek, totalCostThisWeek);
            if (percentChanged === "N/A") {
                $("#costChangeVsBaseline").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#costChangeVsBaseline"), percentChanged);
                $("#costChangeVsBaseline").html(finishedStat);
            }
        } else {
            $("#costChangeVsBaseline").parent().parent().hide();
        }

        // Set goal done / week
        if (json.option.reportItemsToDisplay.useGoalVsThisWeek) {
            $("#goalDonePerWeek").html(json.baseline.goalDonePerWeek);
        } else {
            $("#goalDonePerWeek").parent().parent().hide();
        }

        // Set done this week
        if (json.option.reportItemsToDisplay.useGoalVsThisWeek) {
            $("#actualDoneThisWeek").html(totalUsesThisWeek);
            // Higher or lower than goal?
            if (totalUsesThisWeek < json.baseline.goalDonePerWeek) {
                $("#actualDoneThisWeek").addClass("down");
                $("#actualDoneThisWeek").removeClass("up");
            } else if (totalUsesThisWeek >= json.baseline.goalDonePerWeek) {
                $("#actualDoneThisWeek").addClass("up");
                $("#actualDoneThisWeek").removeClass("down");
            }
        } else {
            $("#goalDonePerWeek").parent().parent().hide();
        }

        // Set goal spent / week
        if (json.option.reportItemsToDisplay.costGoalVsThisWeek) {
            $("#goalSpentPerWeek").html(json.baseline.goalSpentPerWeek + "$");
        } else {
            $("#goalSpentPerWeek").parent().parent().hide();
        }

        // Set spent this week
        if (json.option.reportItemsToDisplay.costGoalVsThisWeek) {
            $("#actualSpentThisWeek").html(totalCostThisWeek + "$");
            // Higher or lower than goal?
            if (totalCostThisWeek <= json.baseline.goalSpentPerWeek) {
                $("#actualSpentThisWeek").addClass("down");
                $("#actualSpentThisWeek").removeClass("up");
            } else if (totalCostThisWeek > json.baseline.goalSpentPerWeek) {
                $("#actualSpentThisWeek").addClass("up");
                $("#actualSpentThisWeek").removeClass("down");
            }
        } else {
            $("#goalSpentPerWeek").parent().parent().hide();
        }

        // Remove table headers given case of nothing to be displayed in table
        if (!(json.option.reportItemsToDisplay.useGoalVsThisWeek) && !(json.option.reportItemsToDisplay.costGoalVsThisWeek)) {
            $(".goal-report thead").hide();
        }
    }

    // Public API
    return {
        segregatedTimeRange: segregatedTimeRange,
        midnightOfTimestamp: midnightOfTimestamp,
        calculateMaxReportHeight: calculateMaxReportHeight,
        calculateReportValues: calculateReportValues,
        initiateReport: initiateReport,
        percentChangedBetween: percentChangedBetween,
        formatPercentChangedStat: formatPercentChangedStat,
        timestampToShortHandDate: timestampToShortHandDate,
        convertSecondsToDateFormat: convertSecondsToDateFormat,
        displayAverageTimeBetween: function (actionType, timeIncrement, json) {
            displayAverageTimeBetween(actionType, timeIncrement, json, convertSecondsToDateFormat);
        },
        recalculateAverageTimeBetween: recalculateAverageTimeBetween,
        displayLongestGoal: function (timeIncrement, json) {
            displayLongestGoal(timeIncrement, json, convertSecondsToDateFormat);
        },
        createReport: function (reportValues, json) {
            createReport(reportValues, json);
        },
        createReportForEndStamp: function (reportEndStamp, json) {
            var reportValues = calculateReportValues(reportEndStamp, json);
            createReport(reportValues, json);
        }
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsModule;
} else {
    window.StatisticsModule = StatisticsModule;
}
