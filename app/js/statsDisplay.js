/**
 * StatsDisplayModule - Display and DOM manipulation for statistics
 * Handles rendering statistics to the UI, reports, and formatting for display
 */
var StatsDisplayModule = (function () {
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
     * Display average time between actions
     * @param {string} actionType - Action type (cost, use)
     * @param {string} timeIncrement - Time increment (total, week, month, year)
     * @param {Object} json - App state object
     */
    function displayAverageTimeBetween(actionType, timeIncrement, json) {
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
                    StatsCalculationsModule.convertSecondsToDateFormat(finalStringStats[key], true)
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

        // Total uses (filter out null entries)
        var count = jsonObject.action.filter(function (e) {
            return e && e.clickType == actionGerund;
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
        displayAverageTimeBetween(actionType, timeIncrement, json);
    }

    /**
     * Display longest goal
     * @param {string} timeIncrement - Time increment (total, week, month, year)
     * @param {Object} json - App state object
     */
    function displayLongestGoal(timeIncrement, json) {
        // Delegate to displayLongestWait for backward compatibility
        displayLongestWait(timeIncrement, json);
    }

    /**
     * Display longest wait time for a specific time increment
     * @param {string} timeIncrement - 'week', 'month', or 'year'
     * @param {Object} json - App state object
     */
    function displayLongestWait(timeIncrement, json) {
        var waitStats = json.statistics.wait;
        var longestWait = waitStats ? waitStats.longestWait : null;
        if (longestWait && longestWait[timeIncrement] !== 0 && longestWait[timeIncrement] !== "N/A") {
            var html = StatsCalculationsModule.convertSecondsToDateFormat(
                longestWait[timeIncrement], 
                true
            );
            $(".statistic.longestWait." + timeIncrement + ", .statistic.longestGoal." + timeIncrement).html(html);
        }
    }

    /**
     * Get period duration in seconds based on period type
     * @param {string} period - 'day', 'week', or 'month'
     * @returns {number} - Duration in seconds
     */
    function getPeriodDuration(period) {
        switch (period) {
            case 'day': return 60 * 60 * 24;
            case 'week': return 60 * 60 * 24 * 7;
            case 'month': return 60 * 60 * 24 * 30;
            default: return 60 * 60 * 24 * 7;
        }
    }

    /**
     * Get number of data points for the period
     * @param {string} period - 'day', 'week', or 'month'
     * @returns {number} - Number of data points
     */
    function getDataPointCount(period) {
        switch (period) {
            case 'day': return 24; // Hourly for day view
            case 'week': return 7;  // Daily for week view
            case 'month': return 30; // Daily for month view
            default: return 7;
        }
    }

    /**
     * Create object of values from the end date timestamp with flexible period and metric
     * @param {number} reportEndStamp - Report end timestamp
     * @param {Object} json - App state object
     * @returns {Object} - Values object for report
     */
    function calculateReportValues(reportEndStamp, json) {
        var metric = json.option.reportItemsToDisplay.reportMetric || 'usage';
        var period = json.option.reportItemsToDisplay.reportPeriod || 'week';
        var dataPoints = getDataPointCount(period);
        var periodDuration = getPeriodDuration(period);
        
        var valuesObject = {
            "reportStart": -1,
            "reportEnd": -1,
            "metric": metric,
            "period": period,
            "used": {
                "values": new Array(dataPoints).fill(0),
                "total": 0,
                "lastPeriod": 0
            },
            "craved": {
                "values": new Array(dataPoints).fill(0),
                "total": 0,
                "lastPeriod": 0
            },
            "bought": {
                "values": new Array(dataPoints).fill(0),
                "total": 0,
                "lastPeriod": 0
            },
            "timed": {
                "values": new Array(dataPoints).fill(0),
                "total": 0,
                "lastPeriod": 0
            },
            "waited": {
                "values": new Array(dataPoints).fill(0),
                "total": 0,
                "lastPeriod": 0
            }
        };

        var jsonObject = StorageModule.retrieveStorageObject();

        // Build new date as midnight of requested date
        var midnightLastDay = StatsCalculationsModule.midnightOfTimestamp(reportEndStamp);

        // Start based on period
        var reportStartStamp = midnightLastDay - periodDuration;
        var lastPeriodStartStamp = reportStartStamp - periodDuration;

        // Update report valuesObject
        valuesObject.reportStart = reportStartStamp;
        valuesObject.reportEnd = midnightLastDay;
        json.report.activeEndStamp = midnightLastDay;

        // Calculate interval for each data point
        var intervalDuration = periodDuration / dataPoints;

        for (var i = 0; i < dataPoints; i++) {
            var intervalStart = reportStartStamp + (intervalDuration * i);
            var intervalEnd = reportStartStamp + (intervalDuration * (i + 1));

            if (metric === 'usage') {
                // Count uses and resists
                var usedInInterval = jsonObject.action.filter(function(e) {
                    return e && e.clickType === 'used' && 
                           e.timestamp >= intervalStart && e.timestamp < intervalEnd;
                });
                var cravedInInterval = jsonObject.action.filter(function(e) {
                    return e && e.clickType === 'craved' && 
                           e.timestamp >= intervalStart && e.timestamp < intervalEnd;
                });
                
                valuesObject.used.values[i] = usedInInterval.length;
                valuesObject.craved.values[i] = cravedInInterval.length;
                valuesObject.used.total += usedInInterval.length;
                valuesObject.craved.total += cravedInInterval.length;
                
            } else if (metric === 'time') {
                // Sum duration of timed actions AND wait durations
                var timedInInterval = jsonObject.action.filter(function(e) {
                    return e && e.clickType === 'timed' && 
                           e.timestamp >= intervalStart && e.timestamp < intervalEnd;
                });
                var waitedInInterval = jsonObject.action.filter(function(e) {
                    return e && (e.clickType === 'wait' || e.clickType === 'goal') && 
                           e.status >= 2 && // completed waits
                           e.timestamp >= intervalStart && e.timestamp < intervalEnd;
                });
                
                var timedSeconds = timedInInterval.reduce(function(sum, e) {
                    return sum + (e.duration || 0);
                }, 0);
                var waitedSeconds = waitedInInterval.reduce(function(sum, e) {
                    var start = e.clickStamp || e.timestamp;
                    var end = e.waitStopped || e.goalStopped || e.timestamp;
                    return sum + Math.max(0, end - start);
                }, 0);
                
                valuesObject.timed.values[i] = timedSeconds;
                valuesObject.waited.values[i] = waitedSeconds;
                valuesObject.timed.total += timedSeconds;
                valuesObject.waited.total += waitedSeconds;
                
            } else if (metric === 'cost') {
                // Sum spent amounts
                var boughtInInterval = jsonObject.action.filter(function(e) {
                    return e && e.clickType === 'bought' && 
                           e.timestamp >= intervalStart && e.timestamp < intervalEnd;
                });
                
                var spent = boughtInInterval.reduce(function(sum, e) {
                    return sum + parseFloat(e.spent || 0);
                }, 0);
                
                valuesObject.bought.values[i] = spent;
                valuesObject.bought.total += spent;
            }
        }

        // Calculate last period totals for comparison
        if (metric === 'usage') {
            valuesObject.used.lastPeriod = jsonObject.action.filter(function(e) {
                return e && e.clickType === 'used' && 
                       e.timestamp >= lastPeriodStartStamp && e.timestamp < reportStartStamp;
            }).length;
            valuesObject.craved.lastPeriod = jsonObject.action.filter(function(e) {
                return e && e.clickType === 'craved' && 
                       e.timestamp >= lastPeriodStartStamp && e.timestamp < reportStartStamp;
            }).length;
        } else if (metric === 'cost') {
            var lastPeriodBought = jsonObject.action.filter(function(e) {
                return e && e.clickType === 'bought' && 
                       e.timestamp >= lastPeriodStartStamp && e.timestamp < reportStartStamp;
            });
            valuesObject.bought.lastPeriod = lastPeriodBought.reduce(function(sum, e) {
                return sum + parseFloat(e.spent || 0);
            }, 0);
        }

        return valuesObject;
    }

    /**
     * Get legend labels based on metric and habit direction
     * @param {string} metric - 'usage', 'time', or 'cost'
     * @param {boolean} isDecreaseHabit - Whether this is a "do less" habit
     * @returns {Object} - { primary: string, secondary: string|null }
     */
    function getLegendLabels(metric, isDecreaseHabit) {
        if (metric === 'usage') {
            if (isDecreaseHabit) {
                // Do it less + Times done: red=did it, green=resisted
                return { primary: 'Did It', secondary: 'Resisted' };
            } else {
                // Do it more + Times done: red=didn't do it, green=did it
                return { primary: "Didn't Do It", secondary: 'Did It' };
            }
        } else if (metric === 'time') {
            if (isDecreaseHabit) {
                // Do it less + Time spent: red=time spent, green=time waited
                return { primary: 'Time Spent', secondary: 'Time Waited' };
            } else {
                // Do it more + Time spent: red=time procrastinated, green=time spent
                return { primary: 'Time Procrastinated', secondary: 'Time Spent' };
            }
        } else if (metric === 'cost') {
            if (isDecreaseHabit) {
                // Do it less + Money spent: red=money spent, green=(none)
                return { primary: 'Money Spent', secondary: null };
            } else {
                // Do it more + Money spent: red=(none), green=money invested
                return { primary: null, secondary: 'Money Invested' };
            }
        }
        return { primary: 'Primary', secondary: 'Secondary' };
    }

    /**
     * Create report with flexible metric and period
     * @param {Object} reportValues - Report values
     * @param {Object} json - App state object
     */
    function createReport(reportValues, json) {
        // Remove d-none from report template
        if ($($(".weekly-report")[0]).hasClass("d-none")) {
            $($(".weekly-report")[0]).removeClass("d-none");
        }

        var metric = reportValues.metric;
        var period = reportValues.period;
        var reportStart = reportValues.reportStart;
        var reportEnd = reportValues.reportEnd;
        var isDecreaseHabit = json.option && json.option.baseline && json.option.baseline.decreaseHabit;

        // Update legend labels based on metric and habit direction
        var legendLabels = getLegendLabels(metric, isDecreaseHabit);
        
        // Update legend display
        if (legendLabels.primary) {
            $('.legend-primary-item').show();
            $('.legend-primary-label').text(legendLabels.primary);
        } else {
            $('.legend-primary-item').hide();
        }
        
        if (legendLabels.secondary) {
            $('.legend-secondary-item').show();
            $('.legend-secondary-label').text(legendLabels.secondary);
        } else {
            $('.legend-secondary-item').hide();
        }

        // Set date range display based on period
        if (period === 'day') {
            // For daily, show just the single date
            var dayDate = StatsCalculationsModule.timestampToShortHandDate(reportEnd, true);
            $("#reportStartDate").html(dayDate);
            $(".week-range .seperator").hide();
            $(".week-range .end").hide();
        } else {
            // For week/month, show range
            $("#reportStartDate").html(StatsCalculationsModule.timestampToShortHandDate(reportStart, true));
            $("#reportEndDate").html(StatsCalculationsModule.timestampToShortHandDate(reportEnd, true));
            $(".week-range .seperator").show();
            $(".week-range .end").show();
        }

        // Generate labels based on period
        var labels = [];
        var dataPoints = reportValues.used.values.length;
        var intervalDuration = (reportEnd - reportStart) / dataPoints;

        for (var i = 0; i < dataPoints; i++) {
            var labelTimestamp = reportStart + (intervalDuration * (i + 1));
            if (period === 'day') {
                // Hour labels for day view - show every other
                var hour = new Date(labelTimestamp * 1000).getHours();
                var ampm = hour >= 12 ? 'pm' : 'am';
                hour = hour % 12 || 12;
                labels.push(i % 2 === 0 ? '' : hour + ampm); // Skip every other
            } else if (period === 'month') {
                // Month labels - show every other to reduce crowding
                if (i % 2 === 0) {
                    labels.push('');
                } else {
                    labels.push(StatsCalculationsModule.timestampToShortHandDate(labelTimestamp, false));
                }
            } else {
                labels.push(StatsCalculationsModule.timestampToShortHandDate(labelTimestamp, false));
            }
        }

        // Prepare chart data based on metric
        var data, options;
        var useCumulativeChart = (period === 'day');

        if (metric === 'usage') {
            // For "do less": series[0]=resisted (green), series[1]=did it (red)
            // For "do more": series[0]=didn't (red), series[1]=did it (green)
            // Chartist renders series[0] first (primary/red), series[1] second (secondary/green)
            if (isDecreaseHabit) {
                // Red = did it, Green = resisted
                data = {
                    labels: labels,
                    series: [
                        reportValues.used.values,   // Did it (red/primary)
                        reportValues.craved.values  // Resisted (green/secondary)
                    ]
                };
            } else {
                // Red = didn't, Green = did it
                data = {
                    labels: labels,
                    series: [
                        reportValues.craved.values, // Didn't (red/primary)
                        reportValues.used.values    // Did it (green/secondary)
                    ]
                };
            }
            options = {
                high: json.report.maxHeight > 4 ? json.report.maxHeight : 4,
                seriesBarDistance: 10
            };
        } else if (metric === 'time') {
            // Determine best time unit based on data magnitude
            var totalTimedSeconds = reportValues.timed.values.reduce(function(a, b) { return a + b; }, 0);
            var totalWaitedSeconds = reportValues.waited.values.reduce(function(a, b) { return a + b; }, 0);
            var maxSeconds = Math.max(totalTimedSeconds, totalWaitedSeconds);
            
            // Use hours if max is > 2 hours, otherwise minutes
            var useHours = maxSeconds > 7200;
            var timeUnit = useHours ? 'hrs' : 'min';
            var divisor = useHours ? 3600 : 60;
            
            var timedValues = reportValues.timed.values.map(function(s) { 
                return Math.round((s / divisor) * 10) / 10; // One decimal place
            });
            var waitedValues = reportValues.waited.values.map(function(s) { 
                return Math.round((s / divisor) * 10) / 10;
            });
            
            if (isDecreaseHabit) {
                // Red = time spent, Green = time waited
                data = {
                    labels: labels,
                    series: [
                        timedValues,  // Time spent (red/primary)
                        waitedValues  // Time waited (green/secondary)
                    ]
                };
            } else {
                // Red = time procrastinated (waited), Green = time spent
                data = {
                    labels: labels,
                    series: [
                        waitedValues, // Time procrastinated (red/primary)
                        timedValues   // Time spent (green/secondary)
                    ]
                };
            }
            var maxTime = Math.max(
                Math.max.apply(null, timedValues.length ? timedValues : [0]),
                Math.max.apply(null, waitedValues.length ? waitedValues : [0])
            );
            // Use concise labels: "5m" or "2h"
            var shortUnit = useHours ? 'h' : 'm';
            options = {
                high: maxTime > 1 ? Math.ceil(maxTime * 1.2) : 5,
                seriesBarDistance: 10,
                axisY: {
                    labelInterpolationFnc: function(value) {
                        return Math.round(value) + shortUnit;
                    }
                }
            };
        } else if (metric === 'cost') {
            if (isDecreaseHabit) {
                // Red = money spent (only one series)
                data = {
                    labels: labels,
                    series: [
                        reportValues.bought.values // Money spent (red/primary)
                    ]
                };
            } else {
                // Green = money invested (only one series, but in secondary position)
                // We use an empty primary series to keep colors consistent
                data = {
                    labels: labels,
                    series: [
                        new Array(dataPoints).fill(0), // Empty primary
                        reportValues.bought.values     // Money invested (green/secondary)
                    ]
                };
            }
            var maxCost = Math.max.apply(null, reportValues.bought.values.length ? reportValues.bought.values : [0]);
            options = {
                high: maxCost > 5 ? Math.ceil(maxCost * 1.2) : 10,
                seriesBarDistance: 10,
                axisY: {
                    labelInterpolationFnc: function(value) {
                        return '$' + value;
                    }
                }
            };
        }

        var responsiveOptions = [
            ['screen and (max-width: 640px)', {
                seriesBarDistance: 5
            }]
        ];

        // Create chart - use Line for cumulative day view, Bar otherwise
        if (useCumulativeChart) {
            // For daily view, only show data up to current hour (not future)
            var currentHour = new Date().getHours();
            // Add 2 to include the interval that contains the current hour 
            // (interval i covers hour i to i+1, so at 8:50pm we need interval 20 which shows 9pm as end)
            var hoursToShow = Math.min(currentHour + 2, dataPoints);
            
            // Truncate data to only include past/current hours
            var truncatedLabels = data.labels.slice(0, hoursToShow);
            var truncatedSeries = data.series.map(function(series) {
                return series.slice(0, hoursToShow);
            });
            
            // Ensure the last label is always visible (not skipped)
            if (truncatedLabels.length > 0 && truncatedLabels[truncatedLabels.length - 1] === '') {
                var lastTimestamp = reportStart + (intervalDuration * hoursToShow);
                var lastHour = new Date(lastTimestamp * 1000).getHours();
                var ampm = lastHour >= 12 ? 'pm' : 'am';
                lastHour = lastHour % 12 || 12;
                truncatedLabels[truncatedLabels.length - 1] = lastHour + ampm;
            }
            
            // Convert to cumulative values for day view
            var cumulativeData = {
                labels: truncatedLabels,
                series: truncatedSeries.map(function(series) {
                    var cumulative = [];
                    var sum = 0;
                    for (var i = 0; i < series.length; i++) {
                        sum += series[i];
                        cumulative.push(sum);
                    }
                    return cumulative;
                })
            };
            
            // Calculate max for cumulative data
            var cumulativeMax = 0;
            cumulativeData.series.forEach(function(series) {
                var seriesMax = series.length > 0 ? series[series.length - 1] : 0;
                if (seriesMax > cumulativeMax) cumulativeMax = seriesMax;
            });
            
            var lineOptions = {
                high: cumulativeMax > 1 ? Math.ceil(cumulativeMax * 1.2) : options.high,
                low: 0,
                showArea: true,
                showPoint: true,
                fullWidth: true,
                lineSmooth: Chartist.Interpolation.step(), // Step interpolation for cumulative
                axisX: {
                    showGrid: false
                },
                axisY: options.axisY || {}
            };
            
            var chart = new Chartist.Line('.ct-chart', cumulativeData, lineOptions, responsiveOptions);
            
            // Customize points - only show where cumulative value increases
            chart.on('draw', function(drawData) {
                if (drawData.type === 'point') {
                    var seriesIndex = drawData.seriesIndex;
                    var pointIndex = drawData.index;
                    var series = cumulativeData.series[seriesIndex];
                    
                    // Show point only if value increased from previous
                    var prevValue = pointIndex > 0 ? series[pointIndex - 1] : 0;
                    var currValue = series[pointIndex];
                    
                    if (currValue > prevValue) {
                        // Make increase points visible but small
                        drawData.element.attr({
                            r: 4,
                            style: 'stroke-width: 2px'
                        });
                        drawData.element.addClass('ct-point-increase');
                    } else {
                        // Hide points where no increase
                        drawData.element.attr({
                            r: 0,
                            style: 'display: none'
                        });
                    }
                }
            });
        } else {
            new Chartist.Bar('.ct-chart', data, options, responsiveOptions);
        }

        // Update comparison statistics based on metric
        var totalThisPeriod, totalLastPeriod;
        
        if (metric === 'usage') {
            totalThisPeriod = reportValues.used.total;
            totalLastPeriod = reportValues.used.lastPeriod;
        } else if (metric === 'cost') {
            totalThisPeriod = reportValues.bought.total;
            totalLastPeriod = reportValues.bought.lastPeriod;
        } else {
            totalThisPeriod = reportValues.timed.total;
            totalLastPeriod = reportValues.timed.lastPeriod;
        }

        // Set change vs last period
        if (json.option.reportItemsToDisplay.useChangeVsLastWeek && metric === 'usage') {
            var percentChanged = StatsCalculationsModule.percentChangedBetween(totalLastPeriod, totalThisPeriod);
            if (percentChanged === "N/A") {
                $("#useChangeVsLastWeek").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#useChangeVsLastWeek"), percentChanged);
                $("#useChangeVsLastWeek").html(finishedStat);
            }
            $("#useChangeVsLastWeek").parent().parent().show();
        } else {
            $("#useChangeVsLastWeek").parent().parent().hide();
        }

        // Uses vs baseline
        var weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        // Defensive check - json.statistics may not exist when called with storage object
        var firstClickStamp = (json.statistics && json.statistics.use) 
            ? json.statistics.use.firstClickStamp 
            : (jsonObject.action && jsonObject.action[0] ? jsonObject.action[0].timestamp : 0);
        var beenAWeek = weekAgo.getTime() / 1000 > parseInt(firstClickStamp);

        if (json.option.reportItemsToDisplay.useChangeVsBaseline && beenAWeek && metric === 'usage') {
            var percentChanged = StatsCalculationsModule.percentChangedBetween(
                json.option.baseline.timesDone, 
                totalThisPeriod
            );
            if (percentChanged === "N/A") {
                $("#useChangeVsBaseline").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#useChangeVsBaseline"), percentChanged);
                $("#useChangeVsBaseline").html(finishedStat);
            }
            $("#useChangeVsBaseline").parent().parent().show();
        } else {
            $("#useChangeVsBaseline").parent().parent().hide();
        }

        // Cost comparisons
        if (json.option.reportItemsToDisplay.costChangeVsLastWeek && metric === 'cost') {
            var percentChanged = StatsCalculationsModule.percentChangedBetween(totalLastPeriod, totalThisPeriod);
            if (percentChanged === "N/A") {
                $("#costChangeVsLastWeek").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#costChangeVsLastWeek"), percentChanged);
                $("#costChangeVsLastWeek").html(finishedStat);
            }
            $("#costChangeVsLastWeek").parent().parent().show();
        } else {
            $("#costChangeVsLastWeek").parent().parent().hide();
        }

        if (json.option.reportItemsToDisplay.costChangeVsBaseline && metric === 'cost') {
            var percentChanged = StatsCalculationsModule.percentChangedBetween(
                json.option.baseline.moneySpent, 
                totalThisPeriod
            );
            if (percentChanged === "N/A") {
                $("#costChangeVsBaseline").html("N/A");
            } else {
                var finishedStat = formatPercentChangedStat($("#costChangeVsBaseline"), percentChanged);
                $("#costChangeVsBaseline").html(finishedStat);
            }
            $("#costChangeVsBaseline").parent().parent().show();
        } else {
            $("#costChangeVsBaseline").parent().parent().hide();
        }

        // Goal comparisons - get goal amounts from behavioralGoals
        var jsonObject = StorageModule.retrieveStorageObject();
        var behavioralGoals = jsonObject && jsonObject.behavioralGoals ? jsonObject.behavioralGoals : [];
        
        // Find active usage goal
        var usageGoal = behavioralGoals.find(function(g) {
            return g && g.unit === 'times' && !g.completed;
        });
        var usageGoalAmount = usageGoal ? usageGoal.goalAmount : 0;
        
        if (json.option.reportItemsToDisplay.useGoalVsThisWeek && metric === 'usage' && usageGoalAmount > 0) {
            $("#goalDonePerWeek").html(usageGoalAmount);
            $("#actualDoneThisWeek").html(totalThisPeriod);
            if (totalThisPeriod < usageGoalAmount) {
                $("#actualDoneThisWeek").addClass("down").removeClass("up");
            } else {
                $("#actualDoneThisWeek").addClass("up").removeClass("down");
            }
            $("#goalDonePerWeek").parent().parent().show();
        } else {
            $("#goalDonePerWeek").parent().parent().hide();
        }

        // Find active spending goal
        var spendingGoal = behavioralGoals.find(function(g) {
            return g && g.unit === 'dollars' && !g.completed;
        });
        var spendingGoalAmount = spendingGoal ? spendingGoal.goalAmount : 0;
        
        if (json.option.reportItemsToDisplay.costGoalVsThisWeek && metric === 'cost' && spendingGoalAmount > 0) {
            $("#goalSpentPerWeek").html(spendingGoalAmount + "$");
            $("#actualSpentThisWeek").html(Math.round(totalThisPeriod) + "$");
            if (totalThisPeriod <= spendingGoalAmount) {
                $("#actualSpentThisWeek").addClass("down").removeClass("up");
            } else {
                $("#actualSpentThisWeek").addClass("up").removeClass("down");
            }
            $("#goalSpentPerWeek").parent().parent().show();
        } else {
            $("#goalSpentPerWeek").parent().parent().hide();
        }

        // Remove table headers if nothing to display
        if (!(json.option.reportItemsToDisplay.useGoalVsThisWeek && metric === 'usage') && 
            !(json.option.reportItemsToDisplay.costGoalVsThisWeek && metric === 'cost')) {
            $(".goal-report thead").hide();
        } else {
            $(".goal-report thead").show();
        }
    }

    /**
     * Initiate the report with flexible period
     * @param {Object} json - App state object
     * @returns {boolean} - Whether the report was initiated
     */
    function initiateReport(json) {
        if (!json || !json.option || !json.option.reportItemsToDisplay || !json.option.reportItemsToDisplay.useVsResistsGraph) {
            return false;
        }

        // Ensure json.statistics exists - it may not when called before full initialization
        if (!json.statistics) {
            json.statistics = {
                use: { firstClickStamp: 0, lastClickStamp: 0, clickCounter: 0, betweenClicks: {}, resistStreak: {}, totals: {} },
                cost: { firstClickStamp: 0, lastClickStamp: 0, clickCounter: 0, betweenClicks: {}, totals: {} },
                wait: { longestWait: {}, completedWaits: 0 }
            };
        }

        var jsonObject = StorageModule.retrieveStorageObject();
        var timeNow = Math.round(new Date() / 1000);
        var period = json.option.reportItemsToDisplay.reportPeriod || 'week';

        // Initialize report object if not present (e.g., when called with storage object)
        if (!json.report) {
            json.report = {
                minEndStamp: 0,
                activeEndStamp: 0,
                maxEndStamp: 0,
                maxHeight: 1
            };
        }
        json.report.maxHeight = StatsCalculationsModule.calculateMaxReportHeight(jsonObject);

        // Is there ANY data?
        if (!jsonObject["action"].length) {
            return false;
        }

        // Get period duration
        var periodDuration = getPeriodDuration(period);

        // Calculate end stamp for current period (end of today - 23:59:59)
        var reportEndStamp = StatsCalculationsModule.midnightOfTimestamp(timeNow);

        // Define parameters for report ranges
        var firstStamp = jsonObject.action[0] ? jsonObject.action[0].timestamp : timeNow;
        json.report.minEndStamp = parseInt(firstStamp);
        json.report.maxEndStamp = parseInt(reportEndStamp);
        json.report.periodDuration = periodDuration;

        // Show most recent report
        createReport(calculateReportValues(reportEndStamp, json), json);

        // Setup navigation buttons
        setupReportNavigation(json);

        // Hide report description
        $(".weekly-report-description").hide();

        return true;
    }

    /**
     * Setup report navigation buttons for prev/next
     * @param {Object} json - App state object
     */
    function setupReportNavigation(json) {
        var period = json.option.reportItemsToDisplay.reportPeriod || 'week';
        var periodDuration = getPeriodDuration(period);
        
        // Remove previous handlers
        $('.previous-report, .next-report').off('click');
        
        // Previous button handler
        $('.previous-report').on('click', function() {
            var currentEnd = json.report.activeEndStamp;
            var newEnd = currentEnd - periodDuration;
            
            // Check if we have data for this period
            if (newEnd >= json.report.minEndStamp) {
                json.report.activeEndStamp = newEnd;
                createReport(calculateReportValues(newEnd, json), json);
                updateNavigationButtons(json);
            }
        });
        
        // Next button handler
        $('.next-report').on('click', function() {
            var currentEnd = json.report.activeEndStamp;
            var newEnd = currentEnd + periodDuration;
            
            // Check if we're not going past current date
            if (newEnd <= json.report.maxEndStamp) {
                json.report.activeEndStamp = newEnd;
                createReport(calculateReportValues(newEnd, json), json);
                updateNavigationButtons(json);
            }
        });
        
        // Initial button state
        updateNavigationButtons(json);
    }

    /**
     * Update navigation button disabled states
     * @param {Object} json - App state object
     */
    function updateNavigationButtons(json) {
        var period = json.option.reportItemsToDisplay.reportPeriod || 'week';
        var periodDuration = getPeriodDuration(period);
        var currentEnd = json.report.activeEndStamp;
        
        // Disable previous if we're at the earliest data
        if (currentEnd - periodDuration < json.report.minEndStamp) {
            $('.previous-report').prop('disabled', true);
        } else {
            $('.previous-report').prop('disabled', false);
        }
        
        // Disable next if we're at today
        if (currentEnd >= json.report.maxEndStamp) {
            $('.next-report').prop('disabled', true);
        } else {
            $('.next-report').prop('disabled', false);
        }
    }

    /**
     * Create report for a specific end stamp
     * @param {number} reportEndStamp - Report end timestamp
     * @param {Object} json - App state object
     */
    function createReportForEndStamp(reportEndStamp, json) {
        var reportValues = calculateReportValues(reportEndStamp, json);
        createReport(reportValues, json);
    }

    /**
     * Setup report filter controls and their event handlers
     * @param {Object} json - App state object
     */
    function setupReportFilters(json) {
        var baseline = (json.option && json.option.baseline) || {};
        var reportOptions = json.option.reportItemsToDisplay || {};
        
        // Set initial values from stored options
        $('#reportMetricFilter').val(reportOptions.reportMetric || 'usage');
        $('#reportPeriodFilter').val(reportOptions.reportPeriod || 'week');
        
        // Show/hide metric options based on user's valued metrics
        var $metricFilter = $('#reportMetricFilter');
        
        // Time option - only if valuesTime is set
        if (!baseline.valuesTime) {
            $metricFilter.find('option[value="time"]').hide();
        } else {
            $metricFilter.find('option[value="time"]').show();
        }
        
        // Cost option - only if valuesMoney is set
        if (!baseline.valuesMoney) {
            $metricFilter.find('option[value="cost"]').hide();
        } else {
            $metricFilter.find('option[value="cost"]').show();
        }
        
        // If current metric is hidden, default to usage
        var currentMetric = $metricFilter.val();
        if ((currentMetric === 'time' && !baseline.valuesTime) ||
            (currentMetric === 'cost' && !baseline.valuesMoney)) {
            $metricFilter.val('usage');
            reportOptions.reportMetric = 'usage';
        }
        
        // Handle filter changes
        $('#reportMetricFilter, #reportPeriodFilter').off('change').on('change', function() {
            var newMetric = $('#reportMetricFilter').val();
            var newPeriod = $('#reportPeriodFilter').val();
            
            // Update stored options
            reportOptions.reportMetric = newMetric;
            reportOptions.reportPeriod = newPeriod;
            
            // Save to storage
            var jsonObject = StorageModule.retrieveStorageObject();
            if (jsonObject && jsonObject.option && jsonObject.option.reportItemsToDisplay) {
                jsonObject.option.reportItemsToDisplay.reportMetric = newMetric;
                jsonObject.option.reportItemsToDisplay.reportPeriod = newPeriod;
                StorageModule.setStorageObject(jsonObject);
            }
            
            // Refresh report
            initiateReport(json);
        });
    }

    // Public API
    return {
        formatPercentChangedStat: formatPercentChangedStat,
        displayAverageTimeBetween: displayAverageTimeBetween,
        recalculateAverageTimeBetween: recalculateAverageTimeBetween,
        displayLongestGoal: displayLongestGoal,
        displayLongestWait: displayLongestWait,
        calculateReportValues: calculateReportValues,
        createReport: createReport,
        initiateReport: initiateReport,
        createReportForEndStamp: createReportForEndStamp,
        setupReportFilters: setupReportFilters,
        setupReportNavigation: setupReportNavigation,
        updateNavigationButtons: updateNavigationButtons,
        getPeriodDuration: getPeriodDuration
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsDisplayModule;
} else {
    window.StatsDisplayModule = StatsDisplayModule;
}

