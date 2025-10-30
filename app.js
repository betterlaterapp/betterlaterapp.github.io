/****************************************************************************


Copyright (c) 2021 Corey Boiko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*********************************************************************************/
var welcomeHome;

$(document).ready(function () {
    //CLIENT CAN USE STORAGE SYSTEM - html5
    if (typeof (Storage) !== "undefined") {
        //local working data to use in app
        var json = {
            "statistics": {
                "cost": {
                    "sinceTimerStart": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "clickCounter": 0,
                    "totals": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "firstClickStamp": 0,
                    "lastClickStamp": 0,
                    "betweenClicks": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                },
                "use": {
                    "sinceTimerStart": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "betweenClicks": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0

                    },
                    "clickCounter": 0,
                    "craveCounter": 0,
                    "cravingsInARow": 0,
                    "firstClickStamp": 0,
                    "lastClickStamp": 0,
                    "lastClickStampCrave": 0,
                    "didntPerDid": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "resistStreak": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    }

                },
                "goal": {
                    "untilTimerEnd": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "clickCounter": 0,
                    "lastClickStamp": 0,
                    "longestGoal": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "completedGoals": 0,
                    "activeGoalUse": 0,
                    "activeGoalBought": 0,
                    "activeGoalBoth": 0
                }
            },
            "baseline": {
                "specificSubject": false,
                "decreaseHabit": true,
                "useStatsIrrelevant": false,
                "costStatsIrrelevant": false,
                "amountDonePerWeek": 0,
                "goalDonePerWeek": 0,
                "amountSpentPerWeek": 0,
                "goalSpentPerWeek": 0,
                "valuesTime": true,
                "valuesMoney": true,
                "valuesHealth": true,

            },
            "option": {
                "activeTab": "reports-content",
                "liveStatsToDisplay": {
                    "goalButton": true,
                    "untilGoalEnd": true,
                    "longestGoal": true,
                    "usedButton": true,
                    "usedGoalButton": true,
                    "cravedButton": true,
                    "sinceLastDone": true,
                    "timesDone": true,
                    "avgBetweenDone": true,
                    "didntPerDid": true,
                    "resistedInARow": true,
                    "spentButton": true,
                    "boughtGoalButton": true,
                    "sinceLastSpent": true,
                    "avgBetweenSpent": true,
                    "totalSpent": true
                },
                "logItemsToDisplay": {
                    "goal": true,
                    "used": true,
                    "craved": true,
                    "bought": true,
                    "mood": true
                },
                "reportItemsToDisplay": {
                    "useChangeVsBaseline": false,
                    "useChangeVsLastWeek": true,
                    "useVsResistsGraph": true,
                    "costChangeVsBaseline": false,
                    "costChangeVsLastWeek": true,
                    "useGoalVsThisWeek": false,
                    "costGoalVsThisWeek": false
                }
            },
            "report": {
                "minEndStamp": 0,
                "activeEndStamp": 0,
                "maxEndStamp": 0,
                "maxHeight": 1
            },
            "affirmations": [
                'You are Enough',
                'You are Loved',
                'Be proud of yourself',
                'You are worthy',
                'Believe in yourself',
                'You are grateful',
                'You are resilient',
                'You are strong',
                'You get better every single day',
                'Your best is enough',
                'You are an amazing person',
                'You are loved and worthy',
                'You are open to opportunities',
                'Forgive your mistakes',
                'Know your worth',
                'Trust your decisions',
                'Succeed today',
                'You are allowed to take up space',
                'Nothing can stand in your way',
                'Get healthier every day'
            ]
        };


        //get configuration from storage
        function setOptionsFromStorage() {
            var jsonObject = StorageModule.retrieveStorageObject();
            json.option.activeTab = jsonObject.option.activeTab;

            //set remembered variables for settings page 
            //display logic
            json.option.liveStatsToDisplay = jsonObject.option.liveStatsToDisplay;
            json.option.logItemsToDisplay = jsonObject.option.logItemsToDisplay;
            json.option.reportItemsToDisplay = jsonObject.option.reportItemsToDisplay;

            //SETTINGS PAGE INITIAL DISPLAY
            //LIVE STATS
            for (var key in json.option.liveStatsToDisplay) {
                $("#" + key + "Displayed").prop('checked', json.option.liveStatsToDisplay[key]);
            }
            //HABIT LOG
            for (var key in json.option.logItemsToDisplay) {
                $("#" + key + "RecordDisplayed").prop('checked', json.option.logItemsToDisplay[key]);
            }
            //WEEKLY REPORT
            for (var key in json.option.reportItemsToDisplay) {
                $("#" + key + "Displayed").prop('checked', json.option.reportItemsToDisplay[key]);
            }
            //baseline questionnaire
            json.baseline = jsonObject.baseline;

            // Load baseline values from storage using the module
            BaselineModule.loadBaselineValues();

            // Form population moved to BaselineModule.loadBaselineValues()

            // Checkbox handling moved to BaselineModule.loadBaselineValues()
        }

        //SET STATS FROM STORAGE
        //set initial values in app			 
        function setStatsFromRecords() {
            var jsonObject = StorageModule.retrieveStorageObject();
            var timeNow = Math.round(new Date() / 1000);
            var oneWeekAgoTimeStamp = timeNow - (60 * 60 * 24 * 7);
            var oneMonthAgoTimeStamp = timeNow - (60 * 60 * 24 * 30);
            var oneYearAgoTimeStamp = timeNow - (60 * 60 * 24 * 365);

            /* USE STATISTICS */
            //total USE actions
            var useTabActions = jsonObject.action.filter(function (e) {
                return e.clickType == "used" || e.clickType == "craved";
            });
            useTabActions = useTabActions.sort((a, b) => {
                return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
            });

            var useTabActionsWeek = useTabActions.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var useTabActionsMonth = useTabActions.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var useTabActionsYear = useTabActions.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            if (useTabActions.length > 0) {
                var runningTotal = 0;
                var streak = 0;

                for (const [i, action] of useTabActions.entries()) {
                    //last action found
                    if (useTabActions.length == i + 1) {
                        if (action.clickType == "craved") { streak++; }
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        break;
                    }

                    if (action.clickType == "craved") {
                        streak++;
                        continue;
                    }

                    if (action.clickType == "used") {
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        streak = 0;
                    }

                }

                json.statistics.use.resistStreak.total = runningTotal;

                //console.log("resistStreak total : ", json.statistics.use.resistStreak.total )

            }

            if (useTabActionsWeek.length > 0) {
                var runningTotal = 0;
                var streak = 0;

                for (const [i, action] of useTabActionsWeek.entries()) {

                    //console.log("action: ", action)
                    //last action found
                    if (useTabActionsWeek.length - 1 == i) {
                        if (action.clickType == "craved") { streak++; }
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        break;
                    }
                    if (action.clickType == "craved") {
                        streak++;
                        continue;
                    }
                    if (action.clickType == "used") {
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        streak = 0;
                    }
                }
                json.statistics.use.resistStreak.week = runningTotal;
                //console.log("resistStreak week : ", json.statistics.use.resistStreak.week )

            }

            if (useTabActionsMonth.length > 0) {
                var runningTotal = 0;
                var streak = 0;

                for (const [i, action] of useTabActionsMonth.entries()) {
                    //last action found
                    if (useTabActionsMonth.length - 1 == i) {
                        if (action.clickType == "craved") { streak++; }
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        break;
                    }
                    if (action.clickType == "craved") {
                        streak++;
                        continue;
                    }
                    if (action.clickType == "used") {
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        streak = 0;
                    }
                }
                json.statistics.use.resistStreak.month = runningTotal;
                //console.log("resistStreak month : ", json.statistics.use.resistStreak.month )

            }

            if (useTabActionsYear.length > 0) {
                var runningTotal = 0;
                var streak = 0;

                for (const [i, action] of useTabActionsYear.entries()) {
                    //last action found
                    if (useTabActionsYear.length == i + 1) {
                        if (action.clickType == "craved") { streak++; }
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        break;
                    }
                    if (action.clickType == "craved") {
                        streak++;
                        continue;
                    }
                    if (action.clickType == "used") {
                        //New record
                        if (streak > runningTotal) { runningTotal = streak; }
                        streak = 0;
                    }
                }
                json.statistics.use.resistStreak.year = runningTotal;
                //console.log("resistStreak year : ", json.statistics.use.resistStreak.year )

            }

            var resistStreak = json.statistics.use.resistStreak;

            $(".statistic.use.resistStreak.total").html(resistStreak.total);
            $(".statistic.use.resistStreak.week").html(resistStreak.week);
            $(".statistic.use.resistStreak.month").html(resistStreak.month);
            $(".statistic.use.resistStreak.year").html(resistStreak.year);


            //total uses
            var useCount = jsonObject.action.filter(function (e) {
                return e.clickType == "used";
            });
            useCount = useCount.sort((a, b) => {
                return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
            });
            json.statistics.use.clickCounter = useCount.length;

            var useCountWeek = useCount.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var useCountMonth = useCount.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var useCountYear = useCount.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            //Restart timer value
            if (useCount.length > 0) {

                var sinceLastUse = useCount[useCount.length - 1].timestamp;
                TimersModule.restartTimerAtValues("use", sinceLastUse, json);

                //used to calculate avg time between from json obj, live
                json.statistics.use.firstClickStamp = useCount[0].timestamp;
                //timestamp of most recent click - to limit clicks in a row
                json.statistics.use.lastClickStamp = useCount[useCount.length - 1].timestamp;

                //average time between uses	
                var totalTimeBetween = {}
                var avgTimeBetween = {}

                totalTimeBetween.total = useCount[useCount.length - 1].timestamp - useCount[0].timestamp;

                if (useCount.length > 1) {
                    avgTimeBetween.total = Math.round(totalTimeBetween.total / (useCount.length - 1));
                } else {
                    avgTimeBetween.total = Math.round(totalTimeBetween.total);
                }

                if (useCountWeek.length > 1) {
                    // console.log("avg time between doing (week) is  ", useCountWeek[useCountWeek.length-1].timestamp - useCountWeek[0].timestamp)
                    if (useCountMonth.length == useCountWeek.length) {
                        totalTimeBetween.week = useCountWeek[useCountWeek.length - 1].timestamp - useCountWeek[0].timestamp;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (useCountWeek.length - 1));
                    } else {
                        totalTimeBetween.week = 7 * 24 * 60 * 60;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (useCountWeek.length - 1));
                    }

                } else {
                    // console.log("avg time between doing (week) is default")
                    totalTimeBetween.week = 7 * 24 * 60 * 60;
                    avgTimeBetween.week = 7 * 24 * 60 * 60;
                }

                if (useCountMonth.length > 1) {
                    // console.log("avg time between doing (month) is ", useCountMonth[useCountMonth.length-1].timestamp  - useCountMonth[0].timestamp)
                    if (useCountYear.length == useCountMonth.length) {
                        totalTimeBetween.month = useCountMonth[useCountMonth.length - 1].timestamp - useCountMonth[0].timestamp;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (useCountMonth.length - 1));

                    } else {
                        totalTimeBetween.month = 30 * 24 * 60 * 60;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (useCountMonth.length - 1));

                    }

                } else {
                    // console.log("avg time between doing (month) is default")
                    totalTimeBetween.month = 30 * 24 * 60 * 60;
                    avgTimeBetween.month = 30 * 24 * 60 * 60;
                }

                if (useCountYear.length > 1) {
                    // console.log("useCountYear: ", useCountYear)
                    // console.log("avg time between doing (year) is ", useCountYear[useCountYear.length-1].timestamp - useCountYear[0].timestamp)
                    if (useCountYear.length == useCount.length) {
                        totalTimeBetween.year = useCountYear[useCountYear.length - 1].timestamp - useCountYear[0].timestamp;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (useCountYear.length - 1));

                    } else {
                        totalTimeBetween.year = 365 * 24 * 60 * 60;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (useCountYear.length - 1));
                    }

                } else {
                    // console.log("avg time between doing (year) is default")
                    totalTimeBetween.year = 365 * 24 * 60 * 60;
                    avgTimeBetween.year = 365 * 24 * 60 * 60;
                }

                if (useCount.length > 1) {
                    for (const [key, value] of Object.entries(avgTimeBetween)) {
                        //console.log(`${key}: ${value}`);
                        $(".betweenClicks.use.statistic" + "." + key).html(StatisticsModule.convertSecondsToDateFormat(value, true))
                    }

                    if ($.isNumeric(avgTimeBetween.total)) {
                        json.statistics.use.betweenClicks = {
                            total: avgTimeBetween.total,
                            week: avgTimeBetween.week,
                            month: avgTimeBetween.month,
                            year: avgTimeBetween.year

                        }
                    }
                }
            }

            var doneStatistic = StatisticsModule.segregatedTimeRange(timeNow, useCount);

            //update json
            json.statistics.use.totals = doneStatistic;

            $(".statistic.use.totals.total").html(doneStatistic.total);
            $(".statistic.use.totals.week").html(doneStatistic.week);
            $(".statistic.use.totals.month").html(doneStatistic.month);
            $(".statistic.use.totals.year").html(doneStatistic.year);

            //total craves
            var craveCount = jsonObject.action.filter(function (e) {
                return e.clickType == "craved";
            });
            json.statistics.use.craveCounter = craveCount.length;

            var craveCountWeek = craveCount.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var craveCountMonth = craveCount.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var craveCountYear = craveCount.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            //craves in a row
            var cravesInARow = 0;
            for (var i = useTabActions.length - 1; i >= 0; i--) {
                if (useTabActions[i].clickType == "craved") {
                    cravesInARow++;
                } else {
                    break;
                }
            }
            //update display	
            $("#cravingsResistedInARow").html(cravesInARow);
            //update json
            json.statistics.use.cravingsInARow = cravesInARow;

            //timestamp of most recent click - to limit clicks in a row
            if (craveCount.length > 0) {
                json.statistics.use.lastClickStampCrave = craveCount[craveCount.length - 1].timestamp;
            }

            //avg craves per smoke

            var didntPerDidtotal = Math.round(craveCount.length / useCount.length * 10) / 10;
            var didntPerDidweek = Math.round(craveCountWeek.length / useCountWeek.length * 10) / 10;
            var didntPerDidmonth = Math.round(craveCountMonth.length / useCountMonth.length * 10) / 10;
            var didntPerDidyear = Math.round(craveCountYear.length / useCountYear.length * 10) / 10;

            var didntPerDidTotals = {
                "total": isFinite(didntPerDidtotal) ? didntPerDidtotal : "N/A",
                "week": isFinite(didntPerDidweek) ? didntPerDidweek : "N/A",
                "month": isFinite(didntPerDidmonth) ? didntPerDidmonth : "N/A",
                "year": isFinite(didntPerDidyear) ? didntPerDidyear : "N/A"
            }

            json.statistics.use.didntPerDid = didntPerDidTotals;

            for (const [key, value] of Object.entries(didntPerDidTotals)) {
                //console.log(`${key}: ${value}`);
                $(".didntPerDid.statistic." + key).html(value)
            }

            /* COST STATISTICS */
            //total boughts
            var costCount = jsonObject.action.filter(function (e) {
                return e.clickType == "bought";
            });
            json.statistics.cost.clickCounter = costCount.length;

            var costCountWeek = costCount.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var costCountMonth = costCount.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var costCountYear = costCount.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            //Restart timer value
            if (costCount.length > 0) {
                var sinceLastCost = costCount[costCount.length - 1].timestamp;
                TimersModule.restartTimerAtValues("cost", sinceLastCost, json);

                //used to calculate avg time between from json obj, live
                json.statistics.cost.firstClickStamp = costCount[0].timestamp;
                json.statistics.cost.lastClickStamp = costCount[costCount.length - 1].timestamp;

                //average time between uses	
                var totalTimeBetween = {}
                var avgTimeBetween = {}

                totalTimeBetween.total = costCount[costCount.length - 1].timestamp - costCount[0].timestamp;
                avgTimeBetween.total = Math.round(totalTimeBetween.total / (costCount.length - 1));

                if (costCountWeek.length > 1) {
                    //console.log("avg time between COST (week) is  ", costCountWeek[costCountWeek.length - 1].timestamp - costCountWeek[0].timestamp)
                    if (costCountMonth.length == costCountWeek.length) {
                        totalTimeBetween.week = costCountWeek[costCountWeek.length - 1].timestamp - costCountWeek[0].timestamp;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (costCountWeek.length - 1));
                    } else {
                        totalTimeBetween.week = 7 * 24 * 60 * 60;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (costCountWeek.length - 1));
                    }

                } else {
                    //console.log("avg time between COST (week) is default")
                    totalTimeBetween.week = 7 * 24 * 60 * 60;
                    avgTimeBetween.week = 7 * 24 * 60 * 60;
                }

                if (costCountMonth.length >= 1) {
                    //console.log("avg time between COST (month) is ", timeNow - costCountMonth[0].timestamp)
                    if (costCountYear.length == costCountMonth.length) {
                        totalTimeBetween.month = costCountMonth[costCountMonth.length - 1].timestamp - costCountMonth[0].timestamp;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (costCountMonth.length - 1));

                    } else {
                        totalTimeBetween.month = 30 * 24 * 60 * 60;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (costCountMonth.length - 1));

                    }

                } else {
                    //console.log("avg time between COST (month) is default")
                    totalTimeBetween.month = 30 * 24 * 60 * 60;
                    avgTimeBetween.month = 30 * 24 * 60 * 60;
                }

                if (costCountYear.length >= 1) {
                    //console.log("avg time between COST (year) is ", timeNow - costCountYear[0].timestamp)
                    if (costCountYear.length == costCount.length) {
                        totalTimeBetween.year = costCountYear[costCountYear.length - 1].timestamp - costCountYear[0].timestamp;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (costCountYear.length - 1));

                    } else {
                        totalTimeBetween.year = 365 * 24 * 60 * 60;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (costCountYear.length - 1));
                    }

                } else {
                    //console.log("avg time between COST (year) is default")
                    totalTimeBetween.year = 365 * 24 * 60 * 60;
                    avgTimeBetween.year = 365 * 24 * 60 * 60;
                }

                for (const [key, value] of Object.entries(avgTimeBetween)) {
                    //console.log(`${key}: ${value}`);
                    $(".betweenClicks.cost.statistic" + "." + key).html(StatisticsModule.convertSecondsToDateFormat(value, true))
                }

                if ($.isNumeric(avgTimeBetween.total)) {
                    json.statistics.cost.betweenClicks = {
                        total: avgTimeBetween.total,
                        week: avgTimeBetween.week,
                        month: avgTimeBetween.month,
                        year: avgTimeBetween.year

                    }
                }
            }

            var spentStatistic = StatisticsModule.segregatedTimeRange(timeNow, costCount, "spent");

            //update json
            json.statistics.cost.totals = spentStatistic;

            $(".statistic.cost.totals.total").html("$" + spentStatistic.total);
            $(".statistic.cost.totals.week").html("$" + spentStatistic.week);
            $(".statistic.cost.totals.month").html("$" + spentStatistic.month);
            $(".statistic.cost.totals.year").html("$" + spentStatistic.year);


            var moodCount = jsonObject.action.filter(function (e) {
                return e.clickType == "mood";
            });

            /* GOAL STATISTICS*/
            var goalCount = jsonObject.action.filter(function (e) {
                return e.clickType == "goal";
            });
            goalCount = goalCount.sort((a, b) => {
                return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
            })
            //goal status
            //1 == active goal
            //2 == partially completed goal
            //3 == completed goal

            if (goalCount.length > 0) {
                var activeGoals = goalCount.filter(function (e) {
                    return e.status == 1
                });

                activeGoals = activeGoals.sort((a, b) => {
                    return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
                })

                var inactiveGoals = goalCount.filter(function (e) {
                    return e.status == 2 || e.status == 3
                });
                var inactiveGoalsWeek = goalCount.filter(function (e) {
                    return (e.status == 2 || e.status == 3) && e.timestamp >= oneWeekAgoTimeStamp
                });
                var inactiveGoalsMonth = goalCount.filter(function (e) {
                    return (e.status == 2 || e.status == 3) && e.timestamp >= oneMonthAgoTimeStamp
                });
                var inactiveGoalsYear = goalCount.filter(function (e) {
                    return (e.status == 2 || e.status == 3) && e.timestamp >= oneYearAgoTimeStamp
                });

                //timestamp of most recent click - to limit clicks in a row
                json.statistics.goal.lastClickStamp = goalCount[goalCount.length - 1].timestamp;
                json.statistics.goal.clickCounter = goalCount.length;

                if (activeGoals.length > 0) {
                    var mostRecentGoal = activeGoals[activeGoals.length - 1];

                    //set var in json for if there is an active goal of X type - 
                    //to be used on click of relevant buttons to end goal
                    if (mostRecentGoal.goalType == "both") {
                        json.statistics.goal.activeGoalBoth = 1;
                    } else if (mostRecentGoal.goalType == "use") {
                        json.statistics.goal.activeGoalUse = 1;
                    } else if (mostRecentGoal.goalType == "bought") {
                        json.statistics.goal.activeGoalBought = 1;
                    }

                    var totalSecondsUntilGoalEnd = mostRecentGoal.goalStamp - timeNow;
                    if (totalSecondsUntilGoalEnd > 0) {
                        TimersModule.loadGoalTimerValues(totalSecondsUntilGoalEnd, json);
                        TimerStateManager.initiate('goal', undefined, json);
                    } else {
                        //goal ended while user was away
                        var mostRecentGoal = goalCount[goalCount.length - 1];
                        NotificationsModule.createGoalEndNotification(mostRecentGoal);
                        //last made goal time has concluded
                        $("#goal-content .timer-recepticle").hide();
                    }
                } else {
                    //hide empty timer when last goal has ended
                    $("#goal-content .timer-recepticle").hide();
                }

                if (inactiveGoals.length > 0) {
                    //number of goals Completed
                    json.statistics.goal.completedGoals = inactiveGoals.length;
                    //used for finding longest goal completed
                    var largestDiff = 0;

                    //iterate through goals for longest goal
                    for (var i = 0; i < inactiveGoals.length; i++) {
                        var currStartStamp = inactiveGoals[i].timestamp,
                            currEndStamp = inactiveGoals[i].goalStopped;

                        //find longest completed goal
                        var currDiff = currEndStamp - currStartStamp;
                        if (largestDiff < currDiff) {
                            largestDiff = currDiff;
                        }
                    }

                    json.statistics.goal.completedGoals = inactiveGoals.length;
                    $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
                    json.statistics.goal.longestGoal["total"] = largestDiff;
                    $(".statistic.longestGoal" + ".total").html(StatisticsModule.convertSecondsToDateFormat(largestDiff, true));
                    //console.log('Longest goal (total) is ', StatisticsModule.convertSecondsToDateFormat(largestDiff, true))


                    if (inactiveGoalsWeek.length > 0) {
                        //used for finding longest goal completed
                        var largestDiff = 0;

                        //iterate through goals for longest goal
                        for (var i = 0; i < inactiveGoalsWeek.length; i++) {
                            var currStartStamp = inactiveGoalsWeek[i].timestamp,
                                currEndStamp = inactiveGoalsWeek[i].goalStopped;

                            //find longest completed goal
                            var currDiff = currEndStamp - currStartStamp;
                            if (largestDiff < currDiff) {
                                largestDiff = currDiff;
                            }
                        }

                        //console.log('Longest goal (week) is', StatisticsModule.convertSecondsToDateFormat(largestDiff, true))
                        json.statistics.goal.longestGoal["week"] = largestDiff;
                        $(".statistic.longestGoal" + ".week").html(StatisticsModule.convertSecondsToDateFormat(largestDiff, true));


                    } else {
                        //console.log('Longest goal (week) is default: N/A' )
                        json.statistics.goal.longestGoal["week"] = "N/A";
                        $(".statistic.longestGoal" + ".week").html("N/A");

                    }

                    if (inactiveGoalsMonth.length > 0) {
                        //used for finding longest goal completed
                        var largestDiff = 0;

                        //iterate through goals for longest goal
                        for (var i = 0; i < inactiveGoalsMonth.length; i++) {
                            var currStartStamp = inactiveGoalsMonth[i].timestamp,
                                currEndStamp = inactiveGoalsMonth[i].goalStopped;

                            //find longest completed goal
                            var currDiff = currEndStamp - currStartStamp;
                            if (largestDiff < currDiff) {
                                largestDiff = currDiff;
                            }
                        }

                        //console.log('Longest goal (month) is ', StatisticsModule.convertSecondsToDateFormat(largestDiff, true))
                        json.statistics.goal.longestGoal["month"] = largestDiff;
                        $(".statistic.longestGoal" + ".month").html(StatisticsModule.convertSecondsToDateFormat(largestDiff, true));


                    } else {
                        //console.log('Longest goal (month) is default: N/A' )
                        json.statistics.goal.longestGoal["month"] = "N/A";
                    }

                    if (inactiveGoalsYear.length > 0) {
                        //used for finding longest goal completed
                        var largestDiff = 0;

                        //iterate through goals for longest goal
                        for (var i = 0; i < inactiveGoalsYear.length; i++) {
                            var currStartStamp = inactiveGoalsYear[i].timestamp,
                                currEndStamp = inactiveGoalsYear[i].goalStopped;

                            //find longest completed goal
                            var currDiff = currEndStamp - currStartStamp;
                            if (largestDiff < currDiff) {
                                largestDiff = currDiff;
                            }
                        }

                        //console.log('Longest goal (year) is ', StatisticsModule.convertSecondsToDateFormat(largestDiff, true))
                        json.statistics.goal.longestGoal["year"] = largestDiff;
                        $(".statistic.longestGoal" + ".year").html(StatisticsModule.convertSecondsToDateFormat(largestDiff, true));

                    } else {
                        //console.log('Longest goal (year) is default: N/A' )
                        json.statistics.goal.longestGoal["year"] = "N/A";
                    }

                }
            }


            //NEEEWWWWW USERRR
            if ((useCount == 0 && craveCount == 0 && costCount == 0 && moodCount == 0 && goalCount == 0)
                && json.baseline.specificSubject == false
                && json.option.activeTab == "settings-content") {
                var introMessage = "<b>Welcome back!</b> Start tracking your habit now by clicking any of the buttons on the right.";
                var responseTools = '<button class="btn btn-md btn-outline-info clear-notification" onClick="$(\'.statistics-tab-toggler\').click();">' +
                    "Statistics Panel</button>";

                NotificationsModule.createNotification(introMessage, responseTools);

            } else {

                ActionLogModule.populateHabitLogOnLoad();
            }
        }

        NotificationsModule.init(json);
        TabsModule.init(json, userWasInactive);
        SettingsModule.init(json);
        BaselineModule.init(json);
        UIModule.init(json);
        ActionLogModule.init(json);
        GoalsModule.init(json);
        ButtonsModule.init(json);


        /* Goal completion management */
        function changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo) {
            var result = StorageModule.changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo);

            // Handle UI updates based on storage result
            if (result.wasExtended) {
                TimersModule.loadGoalTimerValues(result.totalSecondsUntilGoalEnd, json);
                TimerStateManager.initiate('goal', undefined, json);
                UIModule.showActiveStatistics(json);
                TimersModule.adjustFibonacciTimerToBoxes("goal-timer", userWasInactive);
            } else if (result.goalWasShorter) {
                var message = "Your current goal was longer than the one you just requested. " +
                    "Don't worry if you can't make it all the way, just try a more manageable goal next time!";
                NotificationsModule.createNotification(message);
            }

            return result;
        }


        /* CALL INITIAL STATE OF APP */
        //If json action table doesn't exist, create it
        if (StorageModule.hasStorageData()) {
            setOptionsFromStorage();
            setStatsFromRecords();

            //set stats	
            //set total clicks for each button
            $("#use-total").html(json.statistics.use.clickCounter);
            $("#crave-total").html(json.statistics.use.craveCounter);
            $("#bought-total").html(json.statistics.cost.clickCounter);

            //Average time between
            StatisticsModule.displayAverageTimeBetween("use", "total", json);
            StatisticsModule.displayAverageTimeBetween("use", "week", json);
            StatisticsModule.displayAverageTimeBetween("use", "month", json);
            StatisticsModule.displayAverageTimeBetween("cost", "total", json);
            StatisticsModule.displayAverageTimeBetween("cost", "week", json);
            StatisticsModule.displayAverageTimeBetween("cost", "month", json);

            $(".longestGoal.statistic").parent().hide();
            var bestTime = json.statistics.goal.longestGoal;
            if (bestTime.week !== "N/A") {
                $(".longestGoal.week.statistic").parent().show();
                StatisticsModule.displayLongestGoal("week", json);
            } else if (bestTime.month !== "N/A" && bestTime.month !== bestTime.week) {
                $(".longestGoal.month.statistic").parent().show();
                StatisticsModule.displayLongestGoal("month", json);
            }
            if (bestTime.total !== "N/A"
                && bestTime.total !== bestTime.week
                && bestTime.total !== bestTime.month) {

                $(".longestGoal.total.statistic").parent().show();
                StatisticsModule.displayLongestGoal("total", json);
            }

            TabsModule.returnToActiveTab();
            TimersModule.hideTimersOnLoad(json);

            //after all is said and done 
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);

            //get them notifcations for useful reports
            StatisticsModule.initiateReport(json);

        } else {
            //replace this with 
            //empty action table
            //basic stat display settings option table
            var newJsonString = '{ "action": [], ' +
                '  "baseline": {"userSubmitted": false, "specificSubject": false, "decreaseHabit": true, "useStatsIrrelevant": false, "costStatsIrrelevant": false, "amountDonePerWeek":"0","goalDonePerWeek":"0","amountSpentPerWeek":"0","goalSpentPerWeek":"0", "valuesTime": true, "valuesMoney": true, "valuesHealth": true},' +
                '  "option": { "activeTab" : "settings-content",' +
                '"liveStatsToDisplay": { "goalButton": true, "untilGoalEnd": true, "longestGoal": true, "usedButton": true, "usedGoalButton": true, "cravedButton": true, "sinceLastDone": true, "timesDone": false, "avgBetweenDone": true, "didntPerDid": true, "resistedInARow": true, "spentButton": true, "boughtGoalButton": true, "sinceLastSpent": true, "avgBetweenSpent": true, "totalSpent": true },' +
                '"logItemsToDisplay" : {"goal": true, "used": true, "craved": true,	"bought": true, "mood": true},' +
                '"reportItemsToDisplay" : {	"useChangeVsBaseline": false, "useChangeVsLastWeek": true, "useVsResistsGraph": true, "costChangeVsBaseline": false, "costChangeVsLastWeek": true, "useGoalVsThisWeek": false, "costGoalVsThisWeek": false}' +
                '} }';
            localStorage.setItem("esCrave", newJsonString);

            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);

            $(".settings-tab-toggler").click();
            $(".displayed-statistics-heading").hide();

            //ABSOLUTE NEW USER
            var introMessage = "<b>Welcome to Better Later</b> - the anonymous habit tracking app that shows you statistics about your habit as you go!";
            NotificationsModule.createNotification(introMessage);
        }


        //Restrict possible dates chosen in goal tab datepicker
        //restrictGoalRange();
        $("#goalEndPicker").datepicker({ minDate: 0 });
        //INITIALIZE GOAL DATE TIME PICKER
        $("#goalEndPicker").datepicker();

        $(".goal.log-more-info button.cancel").click(function () {
            UIModule.closeClickDialog(".goal");
        });

    } else {
        //NO LOCAL STORAGE
        alert("This app uses your local storage to store your data." +
            " That means we DO NO STORE YOUR DATA. You store your data." +
            " BUT, your browser doesn't support local storage, so your data cannot be saved.");
    }

    //refreshes the page automatically, upon user action,
    //to refresh timers from local storage timestamp
    var userWasInactive = false;
    (function manageInactivity() {
        var idleTime = 0;
        //Increment the idle time counter every minute.
        var idleInterval = setInterval(timerIncrement, 1000); // 1 minute

        //Zero the idle timer on mouse movement.
        $(this).mousemove(function (e) {
            idleTime = 0;
        });
        $(this).keypress(function (e) {
            idleTime = 0;
        });

        function timerIncrement() {

            if (document.visibilityState == "hidden") {
                userWasInactive = true;
            }

            idleTime = idleTime + 1;
            if (idleTime >= 10) { // 5 minutes
                if (userWasInactive && document.visibilityState == "visible") {
                    window.location.reload();
                }
            }
        }

    })();

});