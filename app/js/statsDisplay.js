/**
 * StatsDisplayModule - Display and DOM manipulation for statistics
 * Handles rendering statistics to the UI, reports, and formatting for display
 */
var StatsDisplayModule = (function () {
    var HALF_DAY = 12 * 60 * 60;

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

    // Colors for each kind of entry in the do-more sessions chart (green first)
    var ENTRY_TYPE_COLORS = ['#3a8a57', '#2b7bb9', '#d18b00', '#7b4fa8', '#00897b', '#c2185b', '#5d6d7e', '#8d6e63'];

    /**
     * Whether the report shows sessions split by kind of entry: doing more,
     * counting times or amounts, over a week or month.
     */
    function isSessionsView(isDoMore, metric, period) {
        return isDoMore && (metric === 'usage' || metric === 'amount') && period !== 'day';
    }

    /**
     * Doing more, entries that count toward times or amounts done. Timer
     * entries with no unit are time spent, shown only as the time header.
     */
    function isCountedEntry(action) {
        var Calc = StatsCalculationsModule;
        return Calc.isDidItAction(action) && Calc.getEntryType(action) !== 'timed';
    }

    /**
     * Entry types ("pushups", "times", ...) in order of first use,
     * each with a stable color and display label.
     */
    function getEntryTypes(actions) {
        var Calc = StatsCalculationsModule;
        var keys = [];
        actions.filter(isCountedEntry).sort(function(a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        }).forEach(function(a) {
            var key = Calc.getEntryType(a);
            if (keys.indexOf(key) === -1) keys.push(key);
        });
        return keys.map(function(key, i) {
            return {
                key: key,
                label: key === 'timed' ? 'timed' : key,
                color: ENTRY_TYPE_COLORS[i % ENTRY_TYPE_COLORS.length]
            };
        });
    }

    /**
     * Sum every series the report can show into calendar buckets.
     *
     * Doing more, "did it" is counted per session: a session is 1 and is split
     * between the kinds of entries in it. For amounts, each entry counts as a
     * share of that kind's usual session (e.g. 40 pushups when 20 is usual = 2),
     * so exercises on very different scales can share one axis.
     *
     * @param {Array} actions - All actions
     * @param {Array} edges - Bucket boundaries in seconds
     * @param {string} metric - 'usage', 'amount', 'time', or 'cost'
     * @param {boolean} isDoMore - Whether the user is doing more of the habit
     * @param {Array} entryTypes - From getEntryTypes
     * @param {Object} typicalPerSession - From getTypicalAmountPerSession
     * @param {string|null} amountUnit - Not doing more: the one unit amounts are summed in
     * @returns {Object}
     */
    function bucketReportValues(actions, edges, metric, isDoMore, entryTypes, typicalPerSession, amountUnit) {
        var Calc = StatsCalculationsModule;
        var n = edges.length - 1;
        var series = function() { return { values: new Array(n).fill(0), total: 0, lastPeriod: 0 }; };
        var result = { used: series(), craved: series(), bought: series(), timed: series(), waited: series(), stacks: {} };
        entryTypes.forEach(function(t) { result.stacks[t.key] = new Array(n).fill(0); });

        var bucketOf = function(ts) {
            ts = parseInt(ts);
            if (ts < edges[0] || ts >= edges[n]) return -1;
            for (var i = 0; i < n; i++) {
                if (ts < edges[i + 1]) return i;
            }
            return -1;
        };
        var add = function(target, bucket, amount) {
            target.values[bucket] += amount;
            target.total += amount;
        };

        actions.forEach(function(a) {
            if (!a) return;
            var bucket = bucketOf(a.timestamp);
            if (bucket < 0) return;

            if (a.clickType === 'craved') {
                add(result.craved, bucket, 1);
            } else if (a.clickType === 'bought') {
                add(result.bought, bucket, parseFloat(a.spent) || 0);
            } else if (a.clickType === 'wait' && a.status >= 2) {
                add(result.waited, bucket, Math.max(0, parseInt(a.waitStopped) - parseInt(a.timestamp)));
            }
            if (a.clickType === 'timed') {
                add(result.timed, bucket, parseInt(a.duration) || 0);
            }
            if (!isDoMore && Calc.isDidItAction(a)) {
                if (metric !== 'amount') {
                    add(result.used, bucket, 1);
                } else if (!amountUnit || a.unit === amountUnit) {
                    // Amounts are measurements (5 sips, 10mg, 0.5g): only add up one unit
                    add(result.used, bucket, Calc.getEntryAmount(a));
                }
            }
        });

        if (isDoMore) {
            Calc.groupIntoSessions(actions).forEach(function(session) {
                var bucket = bucketOf(session.start);
                var counted = session.entries.filter(isCountedEntry);
                if (bucket < 0 || counted.length === 0) return;
                counted.forEach(function(entry) {
                    var type = Calc.getEntryType(entry);
                    var share = metric === 'amount'
                        ? Calc.getEntryAmount(entry) / (typicalPerSession[type] || 1)
                        : 1 / counted.length;
                    if (result.stacks[type]) result.stacks[type][bucket] += share;
                    add(result.used, bucket, share);
                });
            });
        }

        return result;
    }

    /**
     * Create object of values for the report ending on the day of reportEndStamp
     * @param {number} reportEndStamp - Any time on the report's last day
     * @param {Object} json - App state object
     * @returns {Object} - Values object for report
     */
    function calculateReportValues(reportEndStamp, json) {
        var Calc = StatsCalculationsModule;
        var metric = json.option.reportItemsToDisplay.reportMetric || 'usage';
        var period = json.option.reportItemsToDisplay.reportPeriod || 'week';
        var baseline = (json.option && json.option.baseline) || {};
        var isDoMore = baseline.doMore === true;
        var actions = (StorageModule.retrieveStorageObject().action || []).filter(Boolean);

        var edges = Calc.getReportBucketEdges(period, reportEndStamp);
        var previousEdges = Calc.getReportBucketEdges(period, edges[0] - 12 * 60 * 60);
        var entryTypes = getEntryTypes(actions);
        var typicalPerSession = Calc.getTypicalAmountPerSession(Calc.groupIntoSessions(actions));

        // While a view is still in progress, compare it with the same stretch of
        // the previous period (e.g. today so far vs yesterday up to this time)
        var nowSec = Math.floor(Date.now() / 1000);
        var previousCutoff = nowSec < edges[edges.length - 1]
            ? previousEdges[0] + Math.max(0, nowSec - edges[0])
            : Infinity;
        var previousActions = actions.filter(function(a) { return parseInt(a.timestamp) < previousCutoff; });

        var amountUnit = isDoMore ? null : getMainUnit(actions, edges);
        var values = bucketReportValues(actions, edges, metric, isDoMore, entryTypes, typicalPerSession, amountUnit);
        var previous = bucketReportValues(previousActions, previousEdges, metric, isDoMore, entryTypes, typicalPerSession, amountUnit);
        ['used', 'craved', 'bought', 'timed', 'waited'].forEach(function(key) {
            values[key].lastPeriod = previous[key].total;
        });

        values.metric = metric;
        values.period = period;
        values.edges = edges;
        values.reportStart = edges[0];
        values.reportEnd = edges[edges.length - 1] - 1;
        values.isDoMore = isDoMore;
        values.amountUnit = amountUnit;
        values.entryTypes = entryTypes;
        values.summary = buildReportSummary(actions, previousActions, edges, previousEdges, isDoMore, metric, period, json);

        json.report.activeEndStamp = Calc.noonOfTimestamp(reportEndStamp);
        return values;
    }

    /**
     * The unit logged most often in this view (or ever, if none in view).
     * Measurements in different units can't be added together, so the
     * amount chart shows this one and the summary lists the rest.
     * @returns {string|null} - null when no entries have a unit
     */
    function getMainUnit(actions, edges) {
        var Calc = StatsCalculationsModule;
        var countUnits = function(list) {
            var counts = {};
            list.forEach(function(a) {
                if (Calc.isDidItAction(a) && a.unit) counts[a.unit] = (counts[a.unit] || 0) + 1;
            });
            var units = Object.keys(counts).sort(function(x, y) { return counts[y] - counts[x]; });
            return units[0] || null;
        };
        var inView = actions.filter(function(a) {
            var ts = parseInt(a.timestamp);
            return ts >= edges[0] && ts < edges[edges.length - 1];
        });
        return countUnits(inView) || countUnits(actions);
    }

    /**
     * Totals for the report summary: sessions or times, amount per unit,
     * time, resisted/skipped and spending, for this view and the one before.
     */
    function getSummaryTotals(actions, startSec, endSec, isDoMore) {
        var Calc = StatsCalculationsModule;
        var inRange = function(ts) { ts = parseInt(ts); return ts >= startSec && ts < endSec; };
        var totals = { didIt: 0, units: {}, timeSeconds: 0, craved: 0, spent: 0, waitedSeconds: 0 };

        actions.forEach(function(a) {
            if (!a || !inRange(a.timestamp)) return;
            if (Calc.isDidItAction(a)) {
                if (!isDoMore) totals.didIt++;
                if (a.unit) totals.units[a.unit] = (totals.units[a.unit] || 0) + Calc.getEntryAmount(a);
                if (a.clickType === 'timed') totals.timeSeconds += parseInt(a.duration) || 0;
            } else if (a.clickType === 'craved') {
                totals.craved++;
            } else if (a.clickType === 'bought') {
                totals.spent += parseFloat(a.spent) || 0;
            } else if (a.clickType === 'wait' && a.status >= 2) {
                totals.waitedSeconds += Math.max(0, parseInt(a.waitStopped) - parseInt(a.timestamp));
            }
        });

        if (isDoMore) {
            totals.didIt = Calc.groupIntoSessions(actions).filter(function(s) { return inRange(s.start); }).length;
        }
        return totals;
    }

    /**
     * Lines describing the current view, e.g. "150 pushups (up 15% from last
     * week)". The report settings choose what each line adds: the change from
     * the previous period, and for times done or spending, the starting
     * baseline and goal scaled to this period.
     * goodWhenUp is true/false for coloring, or null for neutral.
     */
    function buildReportSummary(actions, previousActions, edges, previousEdges, isDoMore, metric, period, json) {
        var current = getSummaryTotals(actions, edges[0], edges[edges.length - 1], isDoMore);
        var previous = getSummaryTotals(previousActions, previousEdges[0], previousEdges[previousEdges.length - 1], isDoMore);
        var show = json.option.reportItemsToDisplay || {};
        var baseline = json.option.baseline || {};
        var goals = StorageModule.retrieveStorageObject().behavioralGoals || [];
        var lines = [];
        var push = function(value, prev, label, format, goodWhenUp, options) {
            options = options || {};
            if (!options.always && value === 0 && prev === 0) return;
            lines.push({
                value: value, previous: prev, label: label, format: format, goodWhenUp: goodWhenUp,
                showChange: options.showChange, extras: options.extras || []
            });
        };

        // "start 3" and "goal 7" for this period, toned against the goal direction
        var comparisons = function(value, baselineAmount, baselineTimeline, showBaseline, goal, showGoal, format, goodWhenUp) {
            var extras = [];
            var baselineDays = { day: 1, week: 7, month: 30 }[baselineTimeline] || 7;
            var start = scaleToReportPeriod(baselineAmount, baselineDays, period);
            if (showBaseline && start > 0) {
                extras.push({ text: 'start ' + formatSummaryValue(start, format), tone: 'neutral' });
            }
            if (showGoal && goal) {
                var target = scaleToReportPeriod(goal.goalAmount, goal.measurementTimeline, period);
                var met = goodWhenUp === false ? value <= target : value >= target;
                extras.push({ text: 'goal ' + formatSummaryValue(target, format), tone: goodWhenUp === null ? 'neutral' : (met ? 'good' : 'bad') });
            }
            return extras;
        };

        var didItChange = show.useChangeVsLastWeek !== false;
        if (metric === 'usage' || metric === 'amount') {
            push(current.didIt, previous.didIt, isDoMore ? 'sessions' : 'times', 'number', isDoMore, {
                always: true,
                showChange: didItChange,
                extras: comparisons(current.didIt, baseline.timesDone, baseline.usageTimeline, show.useChangeVsBaseline,
                    getCurrentGoalForUnit(goals, 'times'), show.useGoalVsThisWeek, 'number', isDoMore)
            });
            Object.keys(current.units).concat(Object.keys(previous.units)).filter(function(unit, i, all) {
                return all.indexOf(unit) === i;
            }).forEach(function(unit) {
                push(current.units[unit] || 0, previous.units[unit] || 0, unit, 'number', isDoMore, { showChange: didItChange });
            });
            push(current.timeSeconds, previous.timeSeconds, isDoMore ? 'spent at it' : 'spent on it', 'duration', isDoMore, { showChange: didItChange });
            push(current.craved, previous.craved, isDoMore ? 'skipped' : 'resisted', 'number', !isDoMore, { showChange: didItChange });
        } else if (metric === 'time') {
            push(current.timeSeconds, previous.timeSeconds, isDoMore ? 'spent at it' : 'spent on it', 'duration', isDoMore, { always: true, showChange: didItChange });
            push(current.waitedSeconds, previous.waitedSeconds, 'waited', 'duration', isDoMore ? null : true, { showChange: didItChange });
        } else if (metric === 'cost') {
            var spentGoodWhenUp = isDoMore ? null : false;
            push(current.spent, previous.spent, isDoMore ? 'invested' : 'spent', 'money', spentGoodWhenUp, {
                always: true,
                showChange: show.costChangeVsLastWeek !== false,
                extras: comparisons(current.spent, baseline.moneySpent, baseline.spendingTimeline, show.costChangeVsBaseline,
                    getCurrentGoalForUnit(goals, 'dollars'), show.costGoalVsThisWeek, 'money', spentGoodWhenUp)
            });
        }
        return lines;
    }

    /**
     * Format a duration compactly for chart labels: "45m", "1h 20m", or, when
     * space is tight, "1.5h".
     */
    function formatChartDuration(seconds, compact) {
        var minutes = Math.round(seconds / 60);
        if (minutes < 60) return minutes + 'm';
        if (compact) {
            var hours = minutes / 60;
            return (hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)) + 'h';
        }
        return Math.floor(minutes / 60) + 'h' + (minutes % 60 ? ' ' + (minutes % 60) + 'm' : '');
    }

    function formatSummaryValue(value, format) {
        if (format === 'duration') return formatChartDuration(value, false);
        if (format === 'money') return '$' + (Math.round(value * 100) / 100);
        return String(Math.round(value * 100) / 100);
    }

    /**
     * Render the summary list below the chart.
     */
    function renderReportSummary(reportValues) {
        var period = reportValues.period;
        var nowSec = Math.floor(Date.now() / 1000);
        var isCurrent = reportValues.reportEnd >= nowSec;
        var heading = isCurrent
            ? { day: 'Today', week: 'This week', month: 'This month' }[period]
            : { day: 'That day', week: 'That week', month: 'That month' }[period];
        var comparedTo = isCurrent
            ? { day: 'this time yesterday', week: 'last week', month: 'last month' }[period]
            : { day: 'the day before', week: 'the week before', month: 'the month before' }[period];

        var html = '<div class="report-summary-heading">' + heading + '</div><ul class="report-summary-list">';
        var shownFullPhrase = false;
        reportValues.summary.forEach(function(line) {
            var notes = [];
            if (line.showChange && (line.previous > 0 || line.value > 0)) {
                var pct = line.previous > 0 ? Math.round(((line.value - line.previous) / line.previous) * 100) : null;
                var direction = pct === null ? 'up' : (pct > 0 ? 'up' : (pct < 0 ? 'down' : 'same'));
                var text;
                if (pct === null) {
                    text = 'new';
                } else if (direction === 'same') {
                    text = 'same' + (shownFullPhrase ? '' : ' as ' + comparedTo);
                    shownFullPhrase = true;
                } else {
                    text = direction + ' ' + Math.abs(pct) + '%' + (shownFullPhrase ? '' : ' from ' + comparedTo);
                    shownFullPhrase = true;
                }
                var tone = 'neutral';
                if (line.goodWhenUp !== null && direction !== 'same') {
                    tone = (direction === 'up') === line.goodWhenUp ? 'good' : 'bad';
                }
                notes.push({ text: text, tone: tone });
            }
            notes = notes.concat(line.extras);

            var label = line.value === 1 ? ({ sessions: 'session', times: 'time' }[line.label] || line.label) : line.label;
            var detail = notes.length
                ? ' <span class="report-summary-change">(' + notes.map(function(note) {
                    return '<span class="' + note.tone + '">' + escapeHtml(note.text) + '</span>';
                }).join(' · ') + ')</span>'
                : '';
            html += '<li><strong>' + formatSummaryValue(line.value, line.format) + '</strong> ' +
                escapeHtml(label) + detail + '</li>';
        });
        html += '</ul>';
        $('.report-summary').html(html);
    }

    function escapeHtml(text) {
        return $('<div>').text(text).html();
    }

    /**
     * Get legend labels based on metric and habit direction
     * @param {string} metric - 'usage', 'time', or 'cost'
     * @param {boolean} isdoLess - Whether this is a "do less" habit
     * @returns {Object} - { primary: string, secondary: string|null }
     */
    function getLegendLabels(metric, isdoLess) {
        if (metric === 'usage') {
            if (!isdoLess) {
                return { primary: "Didn't", secondary: 'Did It' };
            } else {
                return { primary: 'Did It', secondary: 'Resisted' };
            }
        } else if (metric === 'amount') {
            if (!isdoLess) {
                return { primary: "Didn't", secondary: 'Amount Done' };
            } else {
                return { primary: 'Amount Done', secondary: 'Resisted' };
            }
        } else if (metric === 'time') {
            if (!isdoLess) {
                // Do it more + Time spent: red=time procrastinated, green=time spent
                return { primary: 'Time Wasted', secondary: 'Time Spent' };
            } else {
                // Do it less + Time spent: red=time spent, green=time waited
                return { primary: 'Time Spent', secondary: 'Time Waited' };
            }
        } else if (metric === 'cost') {
            if (!isdoLess) {
                // Do it more + Money spent: red=(none), green=money invested
                return { primary: null, secondary: 'Money Invested' };
            } else {
                // Do it less + Money spent: red=money spent, green=(none)
                return { primary: 'Money Spent', secondary: null };
            }
        }
        return { primary: 'Primary', secondary: 'Secondary' };
    }

    /**
     * X-axis labels from bucket starts: every 3rd hour for a day, every day
     * for a week, every 3rd day (counting back from the last) for a month.
     */
    function buildChartLabels(edges, period) {
        var Calc = StatsCalculationsModule;
        var count = edges.length - 1;
        var labels = [];
        for (var i = 0; i < count; i++) {
            var start = edges[i];
            if (period === 'day') {
                if (i % 3 === 0) {
                    var hour = new Date(start * 1000).getHours();
                    labels.push((hour % 12 || 12) + (hour >= 12 ? 'pm' : 'am'));
                } else {
                    labels.push('');
                }
            } else if (period === 'month') {
                labels.push((count - 1 - i) % 3 === 0 ? Calc.timestampToShortHandDate(start, false) : '');
            } else {
                labels.push(Calc.timestampToShortHandDate(start, false));
            }
        }
        return labels;
    }

    /**
     * Legend for the sessions chart: one swatch per kind of entry in view,
     * plus a note on what the bars and labels mean.
     */
    function renderSessionsLegend(reportValues) {
        var inView = reportValues.entryTypes.filter(function(t) {
            return reportValues.stacks[t.key].some(function(v) { return v > 0; });
        });
        var html = '<div class="legend-sessions-items">';
        inView.forEach(function(t) {
            html += '<div class="color-descriptor"><div class="color" style="background-color:' + t.color + '"></div>' +
                '<label>' + escapeHtml(t.label) + '</label></div>';
        });
        if (reportValues.craved.total > 0) {
            html += '<div class="color-descriptor"><div class="color primary"></div><label>Didn\'t</label></div>';
        }
        html += '</div>';

        $('.legend-sessions').html(html).removeClass('d-none');
        $('.bar-chart .legend:not(.legend-sessions)').addClass('d-none');
    }

    /**
     * Doing more: for each day, a "Didn't" bar beside a sessions bar
     * that's split by what was done. Time spent is written as a header row
     * across the top of the chart, one entry per column that had any.
     */
    function renderSessionsChart(reportValues, labels, responsiveOptions) {
        var types = reportValues.entryTypes;
        var timedValues = reportValues.timed.values;
        var hasTime = timedValues.some(function(v) { return v > 0; });
        var count = labels.length;
        var compact = count > 7;

        var totals = labels.map(function(_, i) {
            return types.reduce(function(sum, t) { return sum + reportValues.stacks[t.key][i]; }, 0);
        });
        var maxValue = Math.max.apply(null, totals.concat(reportValues.craved.values, [0]));

        // Two bars per column: size them to the column so they never overlap
        var plotWidth = Math.max(100, $('.ct-chart').width() - 50);
        var barWidth = Math.max(2, Math.min(14, (plotWidth / count) * 0.32));

        var chart = new Chartist.Bar('.ct-chart', {
            labels: labels,
            series: [reportValues.craved.values, totals]
        }, {
            low: 0,
            high: maxValue > 3 ? Math.ceil(maxValue * 1.15) : 4,
            seriesBarDistance: barWidth + 1,
            chartPadding: { top: hasTime ? (compact ? 36 : 22) : 10, right: 10 },
            axisY: {
                onlyInteger: true,
                labelInterpolationFnc: function(value) { return Math.round(value); }
            }
        }, responsiveOptions);

        var columnCenters = [];
        chart.on('draw', function(data) {
            if (data.type !== 'bar') return;
            data.element.attr({ style: 'stroke-width: ' + barWidth + 'px' });
            if (data.seriesIndex === 0) return;

            // Replace the sessions total with segments, one per kind of entry
            columnCenters[data.index] = data.x1 - (barWidth + 1) / 2;
            var total = totals[data.index];
            if (!total) return;
            var pixelsPerUnit = (data.y1 - data.y2) / total;
            var base = data.y1;
            types.forEach(function(t) {
                var value = reportValues.stacks[t.key][data.index];
                if (!value) return;
                var top = base - value * pixelsPerUnit;
                data.group.elem('line', { x1: data.x1, x2: data.x2, y1: base, y2: top }, 'ct-bar')
                    .attr({ style: 'stroke: ' + t.color + ' !important; stroke-width: ' + barWidth + 'px' });
                base = top;
            });
            data.element.remove();
        });

        chart.on('created', function(context) {
            if (!hasTime) return;
            var y = context.chartRect.y2 - 6;
            timedValues.forEach(function(seconds, i) {
                if (!seconds) return;
                var x = columnCenters[i] !== undefined
                    ? columnCenters[i]
                    : context.chartRect.x1 + context.axisX.stepLength * (i + 0.5);
                var attributes = compact
                    ? { x: x + 3, y: y, 'text-anchor': 'start', transform: 'rotate(-90 ' + (x + 3) + ' ' + y + ')' }
                    : { x: x, y: y, 'text-anchor': 'middle' };
                context.svg.elem('text', attributes, 'ct-time-label' + (compact ? ' compact' : ''))
                    .text(formatChartDuration(seconds, compact));
            });
        });
    }

    /**
     * Day view: cumulative line across all 24 hours, so the day's total
     * builds up. Hours still to come today are left empty, so the line stops
     * at now while the axis shows the whole day.
     */
    function renderDayChart(data, edges, options, responsiveOptions) {
        var nowSec = Math.floor(Date.now() / 1000);
        var cumulativeData = {
            labels: data.labels,
            series: data.series.map(function(series) {
                var sum = 0;
                return series.map(function(value, i) {
                    if (edges[i] > nowSec) return null;
                    sum += value;
                    return sum;
                });
            })
        };

        var cumulativeMax = 0;
        cumulativeData.series.forEach(function(series) {
            series.forEach(function(v) { if (v !== null && v > cumulativeMax) cumulativeMax = v; });
        });

        var chart = new Chartist.Line('.ct-chart', cumulativeData, {
            high: cumulativeMax > 1 ? Math.ceil(cumulativeMax * 1.2) : options.high,
            low: 0,
            showArea: true,
            showPoint: true,
            fullWidth: true,
            lineSmooth: Chartist.Interpolation.step({ fillHoles: false }),
            axisX: { showGrid: false },
            axisY: options.axisY || {}
        }, responsiveOptions);

        // Only mark the hours where the running total went up
        chart.on('draw', function(drawData) {
            if (drawData.type !== 'point') return;
            var series = cumulativeData.series[drawData.seriesIndex];
            var prevValue = drawData.index > 0 ? (series[drawData.index - 1] || 0) : 0;
            if (series[drawData.index] > prevValue) {
                drawData.element.attr({ r: 4, style: 'stroke-width: 2px' });
                drawData.element.addClass('ct-point-increase');
            } else {
                drawData.element.attr({ r: 0, style: 'display: none' });
            }
        });
    }

    /**
     * Active (not yet ended) quantitative goal for a unit, newest first.
     */
    function getCurrentGoalForUnit(behavioralGoals, unit) {
        var now = Date.now();
        return behavioralGoals.filter(function(g) {
            return g && g.type === 'quantitative' && g.unit === unit && g.status === 'active' &&
                g.createdAt + g.completionTimeline * 24 * 60 * 60 * 1000 > now;
        }).sort(function(a, b) { return b.createdAt - a.createdAt; })[0] || null;
    }

    /**
     * Scale an amount per measurement period to the report's period length.
     */
    function scaleToReportPeriod(amount, periodDays, reportPeriod) {
        var reportDays = { day: 1, week: 7, month: 30 }[reportPeriod] || 7;
        return Math.round(((parseFloat(amount) || 0) / periodDays) * reportDays * 10) / 10;
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
        var isdoLess = json.option && json.option.baseline && json.option.baseline.doLess;
        var sessionsView = isSessionsView(reportValues.isDoMore, metric, period);

        // Update legend labels based on metric and habit direction
        var legendLabels = getLegendLabels(metric, isdoLess);
        if (sessionsView) {
            renderSessionsLegend(reportValues);
        } else {
            $('.legend-sessions').addClass('d-none');
            $('.bar-chart .legend:not(.legend-sessions)').removeClass('d-none');
        }
        if (reportValues.isDoMore && (metric === 'usage' || metric === 'amount')) {
            // Doing more, "did it" is counted in sessions
            legendLabels.secondary = metric === 'amount' ? "Sessions' worth" : 'Sessions';
        } else if (metric === 'amount') {
            var amountLabel = 'Amount' + (reportValues.amountUnit ? ' (' + reportValues.amountUnit + ')' : '');
            if (isdoLess) {
                legendLabels = { primary: amountLabel, secondary: null };
            } else {
                legendLabels = { primary: null, secondary: amountLabel };
            }
        }
        
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
            var dayDate = StatsCalculationsModule.timestampToShortHandDate(reportStart, true);
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

        var labels = buildChartLabels(reportValues.edges, period);
        var dataPoints = labels.length;

        // Prepare chart data based on metric
        var data, options;

        if (metric === 'amount' && !reportValues.isDoMore) {
            // Measurements share no scale with resist counts, so chart amounts alone
            var noSeries = new Array(dataPoints).fill(0);
            data = {
                labels: labels,
                series: isdoLess ? [reportValues.used.values] : [noSeries, reportValues.used.values]
            };
            var maxAmount = Math.max.apply(null, reportValues.used.values.concat([0]));
            options = {
                high: maxAmount > 4 ? Math.ceil(maxAmount * 1.2) : (maxAmount > 0 ? maxAmount * 1.25 : 4),
                seriesBarDistance: 10,
                axisY: {
                    labelInterpolationFnc: function(value) { return Math.round(value * 100) / 100; }
                }
            };
        } else if (metric === 'usage' || metric === 'amount') {
            if (isdoLess) {
                data = {
                    labels: labels,
                    series: [
                        reportValues.used.values,
                        reportValues.craved.values
                    ]
                };
            } else {
                data = {
                    labels: labels,
                    series: [
                        reportValues.craved.values,
                        reportValues.used.values
                    ]
                };
            }
            var maxVal = Math.max(
                Math.max.apply(null, reportValues.used.values.length ? reportValues.used.values : [0]),
                Math.max.apply(null, reportValues.craved.values.length ? reportValues.craved.values : [0])
            );
            options = {
                high: maxVal > 4 ? Math.ceil(maxVal * 1.2) : 4,
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
            
            if (isdoLess) {
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
            if (isdoLess) {
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

        // Day: cumulative line. Week/month: bars side by side; doing more, the
        // sessions bar is split by kind of entry
        if (sessionsView) {
            renderSessionsChart(reportValues, labels, responsiveOptions);
        } else if (period === 'day') {
            renderDayChart(data, reportValues.edges, options, responsiveOptions);
        } else {
            new Chartist.Bar('.ct-chart', data, options, responsiveOptions);
        }

        renderReportSummary(reportValues);
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

        // Reports are anchored at noon of their last day (see noonOfTimestamp)
        var reportEndStamp = StatsCalculationsModule.noonOfTimestamp(timeNow);

        // Earliest logged action (the log isn't always in time order)
        var firstStamp = jsonObject.action.reduce(function(min, a) {
            return a ? Math.min(min, parseInt(a.timestamp)) : min;
        }, timeNow);
        json.report.minEndStamp = firstStamp;
        json.report.maxEndStamp = reportEndStamp;
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
            
            // Check the earlier period has data (newEnd is noon of its last day)
            if (newEnd + HALF_DAY >= json.report.minEndStamp) {
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
        if (currentEnd - periodDuration + HALF_DAY < json.report.minEndStamp) {
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

        // Amount option - if chunking is active OR if valuesTimesDone is set
        // (the "How much" dialog tab is available whenever valuesTimesDone is true,
        // so amounts can be stored independently of chunking configuration)
        var hasChunking = baseline.usageBatched || baseline.usageChunkSize > 0 || baseline.valuesTimesDone;
        if (!hasChunking) {
            $metricFilter.find('option[value="amount"]').hide();
        } else {
            $metricFilter.find('option[value="amount"]').show();
        }

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
        if ((currentMetric === 'amount' && !hasChunking) ||
            (currentMetric === 'time' && !baseline.valuesTime) ||
            (currentMetric === 'cost' && !baseline.valuesMoney)) {
            $metricFilter.val('usage');
            reportOptions.reportMetric = 'usage';
        }

        // When time spent is the user's primary focus (valuesTime without valuesTimesDone),
        // default the report metric to 'time' rather than the global default of 'usage'.
        // Only apply when stored metric is still the generic 'usage' default so the user's
        // explicit selections are never overridden.
        if (baseline.valuesTime && !baseline.valuesTimesDone && reportOptions.reportMetric === 'usage') {
            $metricFilter.val('time');
            reportOptions.reportMetric = 'time';
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

