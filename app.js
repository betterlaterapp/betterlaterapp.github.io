/****************************************************************************
 * This document is kinda long, almost 4000 lines,
 * so let me give you a quick overview of how it is structured
 * 
 * ACTION BUTTONS
 * the app accepts 4 inputs: I bought it, I did it, i didn't do it, Make a goal
 * the goal input extends to a date and time picker,
 * the bought input extends to accept an amount of money,
 * the did and didn't inputs take no additional parameters.
 * 
 * NOTIFICATIONS
 * The app communicates with the users via notifications
 * These notifications can also have response tools included in them, to garner further information from a user,
 * for example, upon returning to the app after a goal has finished, the app will prompt users (with a notificaiton)
 * to confirm they completed the goal, or else give them a new date input to enter in the approximate date the goal actually ended.
 * 
 * MAIN APP PAGES
 * There are 4 main pages (tab-content) in the app: 
 * Baseline (questionnaire), (Live) Statistics, and Settings.
 * 
 * Baseline allows users to input their relationship to a habit (that they chose to track),
 * at the moment (or within the first week) that they start using Better Later.
 *  
 * Clicking any of the action buttons takes users to the Statistics page.
 * Many of the functions in this file are dedicated to update this data onLoad, onClick, in local memory, in storage.
 * Each type of click has a live timer, which is kept in sync even if users close the site, or go inactive.
 * Statistics are shown or hidden based on if they have a relevant value, 
 * there's a function to show relevant statistics, and one to hide them if there isn't enough data for them to be relevant.
 * Many of the functions are related to formatting and displaying statistics about user input, especially to handle goal completion.
 * onLoad, there is a check if a goal has completed since the user has visited the site,
 * if a goal has ended, they are prompted to either confirm the goal as complete, or to mark the date their goal really ended.
 * Any completed goal will populate into a list of completed goals, demonstrating amount of time spent and when the goal ended.
 * 
 * Finally, there is a settings page where users can access some basic controls for the app:
 * a button that removes the last click action in storage (UNDO), 
 * a button to completely wipe storage (START OVER), 
 * a button to read more about the app - which takes the user to the main marketing site (about Better Later),
 * and a button to give feedback about the app (give feedback).
 * Aditionally, the settings page lists every type of statistic possible to be displayed by Better Later, 
 * with a checkbox next to them to decide whether or not to display it.
 * 
 * 
 * and finally - the software license
 * 
 * MIT License

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
                'Radiate confidence',
                'Trust your decisions',
                'Succeed today',
                'You are allowed to take up space',
                'Nothing can stand in your way',
                'Get healthier every day'
            ]
        };

        // Storage functions are now in js/storage.js module
        // Create local aliases for backward compatibility
        var retrieveStorageObject = StorageModule.retrieveStorageObject;
        var setStorageObject = StorageModule.setStorageObject;

        //get configuration from storage
        function setOptionsFromStorage() {
            var jsonObject = retrieveStorageObject();
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
            var jsonObject = retrieveStorageObject();
            var timeNow = Math.round(new Date() / 1000);
            var oneWeekAgoTimeStamp = timeNow - (60 * 60 * 24 * 7);
            var oneMonthAgoTimeStamp = timeNow - (60 * 60 * 24 * 30);
            var oneYearAgoTimeStamp = timeNow - (60 * 60 * 24 * 365);

            /* USE STATISTICS */
            //total USE actions
            var useTabActions = jsonObject.action.filter(function (e) {
                return e.clickType == "used" || e.clickType == "craved";
            });
            useTabActions = useTabActions.sort( (a, b) => {
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

            if(useTabActions.length > 0) {
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
                        if(streak > runningTotal) { runningTotal = streak; }
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
                    if (useTabActionsWeek.length - 1 == i ) {
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
                        if(streak > runningTotal) { runningTotal = streak; }
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
                        if(streak > runningTotal) { runningTotal = streak; }
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
                        if(streak > runningTotal) { runningTotal = streak; }
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
            useCount = useCount.sort( (a, b) => {
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
                restartTimerAtValues("use", sinceLastUse);

                //used to calculate avg time between from json obj, live
                json.statistics.use.firstClickStamp = useCount[0].timestamp;
                //timestamp of most recent click - to limit clicks in a row
                json.statistics.use.lastClickStamp = useCount[useCount.length - 1].timestamp;

                //average time between uses	
                var totalTimeBetween = { }
                var avgTimeBetween   = { }

                totalTimeBetween.total = useCount[useCount.length - 1].timestamp - useCount[0].timestamp;

                if (useCount.length > 1) {
                    avgTimeBetween.total = Math.round(totalTimeBetween.total / (useCount.length - 1) );
                } else {
                    avgTimeBetween.total = Math.round(totalTimeBetween.total);
                }

                if(useCountWeek.length > 1) {
                    // console.log("avg time between doing (week) is  ", useCountWeek[useCountWeek.length-1].timestamp - useCountWeek[0].timestamp)
                    if (useCountMonth.length == useCountWeek.length) {
                        totalTimeBetween.week = useCountWeek[useCountWeek.length-1].timestamp - useCountWeek[0].timestamp;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (useCountWeek.length - 1));
                    } else {
                        totalTimeBetween.week = 7*24*60*60;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (useCountWeek.length - 1));
                    }

                } else {
                    // console.log("avg time between doing (week) is default")
                    totalTimeBetween.week = 7*24*60*60;
                    avgTimeBetween.week = 7*24*60*60;
                }

                if(useCountMonth.length > 1) {
                    // console.log("avg time between doing (month) is ", useCountMonth[useCountMonth.length-1].timestamp  - useCountMonth[0].timestamp)
                    if (useCountYear.length == useCountMonth.length) {
                        totalTimeBetween.month = useCountMonth[useCountMonth.length-1].timestamp - useCountMonth[0].timestamp;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (useCountMonth.length - 1));
                
                    } else {
                        totalTimeBetween.month = 30*24*60*60;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (useCountMonth.length - 1));
                
                    }
                    
                } else {
                    // console.log("avg time between doing (month) is default")
                    totalTimeBetween.month = 30*24*60*60;
                    avgTimeBetween.month = 30*24*60*60;
                }
                
                if(useCountYear.length > 1) {
                    // console.log("useCountYear: ", useCountYear)
                    // console.log("avg time between doing (year) is ", useCountYear[useCountYear.length-1].timestamp - useCountYear[0].timestamp)
                    if (useCountYear.length == useCount.length) {
                        totalTimeBetween.year = useCountYear[useCountYear.length-1].timestamp - useCountYear[0].timestamp;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (useCountYear.length - 1));

                    } else {
                        totalTimeBetween.year = 365*24*60*60;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (useCountYear.length - 1));
                    }

                } else {
                    // console.log("avg time between doing (year) is default")
                    totalTimeBetween.year = 365*24*60*60;
                    avgTimeBetween.year = 365*24*60*60;
                }

                if(useCount.length > 1) {
                    for (const [key, value] of Object.entries(avgTimeBetween)) {
                        //console.log(`${key}: ${value}`);
                        $(".betweenClicks.use.statistic" + "." + key).html(convertSecondsToDateFormat(value, true))
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

            var doneStatistic = segregatedTimeRange(timeNow, useCount);

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
                $(".didntPerDid.statistic." + key) .html(value)
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
                restartTimerAtValues("cost", sinceLastCost);

                //used to calculate avg time between from json obj, live
                json.statistics.cost.firstClickStamp = costCount[0].timestamp;
                json.statistics.cost.lastClickStamp = costCount[costCount.length - 1].timestamp;

                //average time between uses	
                var totalTimeBetween = { }
                var avgTimeBetween   = { }

                totalTimeBetween.total = costCount[costCount.length - 1].timestamp - costCount[0].timestamp;
                avgTimeBetween.total = Math.round(totalTimeBetween.total / (costCount.length - 1) );

                if(costCountWeek.length > 1) {
                    // console.log("avg time between COST (week) is  ", costCountWeek[costCountWeek.length - 1].timestamp - costCountWeek[0].timestamp)
                    if (costCountMonth.length == costCountWeek.length) {
                        totalTimeBetween.week = costCountWeek[costCountWeek.length - 1].timestamp - costCountWeek[0].timestamp;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (costCountWeek.length - 1));
                    } else {
                        totalTimeBetween.week = 7*24*60*60;
                        avgTimeBetween.week = Math.round(totalTimeBetween.week / (costCountWeek.length - 1));
                    }

                } else {
                    //console.log("avg time between COST (week) is default")
                    totalTimeBetween.week = 7*24*60*60;
                    avgTimeBetween.week = 7*24*60*60;
                }

                if(costCountMonth.length >= 1) {
                    //console.log("avg time between COST (month) is ", timeNow - costCountMonth[0].timestamp)
                    if (costCountYear.length == costCountMonth.length) {
                        totalTimeBetween.month = costCountMonth[costCountMonth.length - 1].timestamp - costCountMonth[0].timestamp;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (costCountMonth.length - 1));
                
                    } else {
                        totalTimeBetween.month = 30*24*60*60;
                        avgTimeBetween.month = Math.round(totalTimeBetween.month / (costCountMonth.length - 1));
                
                    }
                    
                } else {
                    //console.log("avg time between COST (month) is default")
                    totalTimeBetween.month = 30*24*60*60;
                    avgTimeBetween.month = 30*24*60*60;
                }
                
                if(costCountYear.length >= 1) {
                    //console.log("avg time between COST (year) is ", timeNow - costCountYear[0].timestamp)
                    if (costCountYear.length == costCount.length) {
                        totalTimeBetween.year = costCountYear[costCountYear.length - 1].timestamp - costCountYear[0].timestamp;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (costCountYear.length - 1));

                    } else {
                        totalTimeBetween.year = 365*24*60*60;
                        avgTimeBetween.year = Math.round(totalTimeBetween.year / (costCountYear.length - 1));
                    }

                } else {
                    //console.log("avg time between COST (year) is default")
                    totalTimeBetween.year = 365*24*60*60;
                    avgTimeBetween.year = 365*24*60*60;
                }

                for (const [key, value] of Object.entries(avgTimeBetween)) {
                    //console.log(`${key}: ${value}`);
                    $(".betweenClicks.cost.statistic" + "." + key).html(convertSecondsToDateFormat(value, true))
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
            
            var spentStatistic = segregatedTimeRange(timeNow, costCount, "spent");

            //update json
            json.statistics.cost.totals = spentStatistic;
            
            $(".statistic.cost.totals.total").html("$" + spentStatistic.total);
            $(".statistic.cost.totals.week").html("$" + spentStatistic.week);
            $(".statistic.cost.totals.month").html("$" + spentStatistic.month);
            $(".statistic.cost.totals.year").html("$" + spentStatistic.year);


            var moodCount = jsonObject.action.filter(function(e) {
                return e.clickType == "mood";
            });

            /* GOAL STATISTICS*/
            var goalCount = jsonObject.action.filter(function (e) {
                return e.clickType == "goal";
            });
            goalCount = goalCount.sort( (a, b) => {
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

                activeGoals = activeGoals.sort( (a, b) => {
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
                        loadGoalTimerValues(totalSecondsUntilGoalEnd);
                        initiateGoalTimer();
                    } else {
                        //console.log("goal ended while user away")
                        //goal ended ewhile user was away
                        var mostRecentGoal = goalCount[goalCount.length - 1];
                        //console.log("mostRecentGoal: ", mostRecentGoal)
                        createGoalEndNotification(mostRecentGoal);
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
                    $(".statistic.longestGoal" + ".total").html(convertSecondsToDateFormat(largestDiff, true));
                    //console.log('Longest goal (total) is ', convertSecondsToDateFormat(largestDiff, true))


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
                        
                        //console.log('Longest goal (week) is', convertSecondsToDateFormat(largestDiff, true))
                        json.statistics.goal.longestGoal["week"] = largestDiff;
                        $(".statistic.longestGoal" + ".week").html(convertSecondsToDateFormat(largestDiff, true));
    
    
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

                        //console.log('Longest goal (month) is ', convertSecondsToDateFormat(largestDiff, true))
                        json.statistics.goal.longestGoal["month"] = largestDiff;
                        $(".statistic.longestGoal" + ".month").html(convertSecondsToDateFormat(largestDiff, true));


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

                        //console.log('Longest goal (year) is ', convertSecondsToDateFormat(largestDiff, true))
                        json.statistics.goal.longestGoal["year"] = largestDiff;
                        $(".statistic.longestGoal" + ".yeah").html(convertSecondsToDateFormat(largestDiff, true));
                        
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
                createNotification(introMessage, responseTools);

            } else {
                /* ADD ACTIONS INTO LOG */
                var allActions = jsonObject.action.filter(function (e) {
                    return e.clickType == "used" ||
                        e.clickType == "craved" ||
                        e.clickType == "bought" ||
                        e.clickType == "mood" ||
                        (e.clickType == "goal" && (e.status == 2 || e.status == 3));
                });
                allActions = allActions.sort( (a, b) => {
                    return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
                })

                /* only display a certain number of actions per page */
                var actionsToAddMax = allActions.length - 1,
                    actionsToAddMin = allActions.length - 10;

                function addMoreIntoHabitLog() {
                    if (actionsToAddMax >= 0) {
                        for (var i = actionsToAddMax; i >= actionsToAddMin && i >= 0; i--) {

                            var currClickStamp = allActions[i].timestamp,
                                currClickType = allActions[i].clickType,
                                currClickCost = null,
                                currGoalEndStamp = -1,
                                currGoalType = "",
                                comment = "",
                                smiley = -1;

                            if (currClickType == "used" || currClickType == "craved") {
                                placeActionIntoLog(currClickStamp, currClickType, currClickCost, null, null, true);

                            } else if (currClickType == "bought") {
                                currClickCost = allActions[i].spent;
                                //append curr action
                                placeActionIntoLog(currClickStamp, currClickType, currClickCost, null, null, true);

                            } else if (currClickType == "goal") {
                                currGoalEndStamp = allActions[i].goalStopped,
                                    currGoalType = allActions[i].goalType;
                                //append 10 new goals
                                placeGoalIntoLog(currClickStamp, currGoalEndStamp, currGoalType, true);
                            } else if (currClickType == "mood") {
                                //append curr action
                                comment = allActions[i].comment;
                                smiley = allActions[i].smiley;
                                
                                placeActionIntoLog(currClickStamp, currClickType, null, comment, smiley, true);

                            }

                            if (i == actionsToAddMin || i == 0) {
                                actionsToAddMin -= 10;
                                actionsToAddMax -= 10;

                                //if button is not displayed
                                if ($("#habit-log-show-more").hasClass("d-none") && allActions.length > 10) {
                                    $("#habit-log-show-more").removeClass("d-none");
                                    $("#habit-log-show-more").click(function () {
                                        addMoreIntoHabitLog();
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
                addMoreIntoHabitLog();
            }
        }

        
        // Statistics functions are now in js/statistics.js module
        // Create local aliases for backward compatibility
        function segregatedTimeRange(timeNow, action, value) {
            return StatisticsModule.segregatedTimeRange(timeNow, action, value);
        }

        function midnightOfTimestamp(timestamp) {
            return StatisticsModule.midnightOfTimestamp(timestamp);
        }

        function calculateMaxReportHeight(storageObject) {
            return StatisticsModule.calculateMaxReportHeight(storageObject, retrieveStorageObject);
        }

        function calculateReportValues(reportEndStamp) {
            return StatisticsModule.calculateReportValues(reportEndStamp, json, retrieveStorageObject);
        }

        function initiateReport() {
            return StatisticsModule.initiateReport(json, retrieveStorageObject, createReport);
        }

        function createReport(reportValues) {
            StatisticsModule.createReport(reportValues, json);
        }

        function percentChangedBetween(first, second) {
            return StatisticsModule.percentChangedBetween(first, second);
        }

        function formatPercentChangedStat(statTarget, percentChanged) {
            return StatisticsModule.formatPercentChangedStat(statTarget, percentChanged);
        }

        function timestampToShortHandDate(timestamp, includeYear) {
            return StatisticsModule.timestampToShortHandDate(timestamp, includeYear);
        }

        $(".previous-report").on("click", function () {
            $('.next-report').prop("disabled", false)
            if (json.report.activeEndStamp - (60 * 60 * 24 * 7) >= json.report.minEndStamp) {
                var reportEndStamp = json.report.activeEndStamp - (60 * 60 * 24 * 7);
                createReport(calculateReportValues(reportEndStamp));
            } else {
                $('.previous-report').prop("disabled", true)
                createNotification("Looks like there isn't enough data to make that report!");

                $('html').animate({ scrollTop: 0 })
            }
        });

        $(".next-report").on("click", function () {
            $('.previous-report').prop("disabled", false)
            if (json.report.activeEndStamp + (60 * 60 * 24 * 7) < json.report.maxEndStamp) {
                var reportEndStamp = json.report.activeEndStamp + (60 * 60 * 24 * 7);
                createReport(calculateReportValues(reportEndStamp));
            } else {
                $('.next-report').prop("disabled", true)
                createNotification("The next report is for a week that has not happened yet!");

                $('html').animate({ scrollTop: 0 })
            }
        });

        // Baseline questionnaire initialization will be moved after createNotification is defined
        

        //function to read settings changes for which stats to display
        (function settingsDisplayChanges() {
            //LIVE STATISTICS
            //listen when changed checkbox inside display options area
            $(".statistics-display-options .form-check-input").on('change', function () {

                //detect specific id
                var itemHandle = this.id;
                var displayCorrespondingStat = false;

                if ($("#" + itemHandle).is(":checked")) {
                    displayCorrespondingStat = true;
                }

                //change value in JSON
                var jsonHandle = itemHandle.replace("Displayed", "");
                json.option.liveStatsToDisplay[jsonHandle] = displayCorrespondingStat;

                //update option table value
                var jsonObject = retrieveStorageObject();
                jsonObject.option.liveStatsToDisplay[jsonHandle] = displayCorrespondingStat;

                setStorageObject(jsonObject);
                showActiveStatistics();
                toggleActiveStatGroups();
                hideInactiveStatistics();

            });

            //HABIT LOG 
            //listen when changed checkbox inside display options area
            $(".habit-log-display-options .form-check-input").on('change', function () {
                //detect specific id
                var itemHandle = this.id;
                var jsonHandle = itemHandle.replace("RecordDisplayed", "");
                var displayCorrespondingStat = false;

                if ($("#" + itemHandle).is(":checked")) {
                    displayCorrespondingStat = true;
                    //remove display none from relevant habit log items
                    $("#habit-log .item." + jsonHandle + "-record").removeClass("d-none");

                } else {
                    //add display none to relevant habit log items
                    $("#habit-log .item." + jsonHandle + "-record").addClass("d-none");
                }

                //change value in JSON
                json.option.logItemsToDisplay[jsonHandle] = displayCorrespondingStat;

                //update option table value
                var jsonObject = retrieveStorageObject();
                jsonObject.option.logItemsToDisplay[jsonHandle] = displayCorrespondingStat;

                setStorageObject(jsonObject);

            });

            //WEEKLY REPORT
            //listen when changed checkbox inside display options area
            $(".report-display-options .form-check-input").on('change', function () {

                //detect specific id
                var itemHandle = this.id;
                var displayCorrespondingStat = false;

                if ($("#" + itemHandle).is(":checked")) {
                    displayCorrespondingStat = true;
                }

                //change value in JSON
                var jsonHandle = itemHandle.replace("Displayed", "");
                json.option.reportItemsToDisplay[jsonHandle] = displayCorrespondingStat;

                //update option table value
                var jsonObject = retrieveStorageObject();
                jsonObject.option.reportItemsToDisplay[jsonHandle] = displayCorrespondingStat;

                //case to remove an existing graph
                if(!json.option.reportItemsToDisplay.useVsResistsGraph) {
                    $(".weekly-report .chart-title").hide();
                    $(".weekly-report .bar-chart").hide();
                    $(".weekly-report .week-range").hide();
                } else {
                    $(".weekly-report .chart-title").show();
                    $(".weekly-report .bar-chart").show();
                    $(".weekly-report .week-range").show();

                }

                setStorageObject(jsonObject);
            });
        }); // End of original baseline code */

        //return to last active tab
        function returnToActiveTab() {
            if (json.option.activeTab) {
                var tabName = json.option.activeTab.split("-")[0];
                $("." + tabName + "-tab-toggler").click();
            } else {
                $("." + "statistics" + "-tab-toggler").click();
            }
        }

        //save current tab on switch
        function saveActiveTab() {
            //update instance json
            json.option.activeTab = $(".tab-pane.active").attr('id');

            //update in option table
            //convert localStorage to json
            var jsonObject = retrieveStorageObject();
            jsonObject.option.activeTab = $(".tab-pane.active").attr('id');
            setStorageObject(jsonObject);

        }

        // Timer helper functions now in js/timers.js module
        function restartTimerAtValues(timerArea, sinceLastAction) {
            TimersModule.restartTimerAtValues(timerArea, sinceLastAction, json);
        }

        // Hide timers on load - now using TimersModule
        function hideTimersOnLoad() {
            TimersModule.hideTimersOnLoad(json, initiateSmokeTimer, initiateBoughtTimer, initiateGoalTimer);
        }

        $("#mood-tracker-area .smiley").on("mouseup", function () {
            $("#mood-tracker-area .smiley").removeClass('selected');
            $(this).addClass('selected')
         });

         $("#mood-tracker-area .response .submit").on("mouseup", function () {
            var now = Math.round(new Date() / 1000);
            var comment = $("#mood-tracker-area .response .text").val();
                
            $.each($("#mood-tracker-area .smiley"), function (i, value) {
                if ($(this).hasClass('selected')) {
                    updateActionTable(now, "mood", null, null, null, comment, i);
                    
                    
                    placeActionIntoLog(now, "mood", null, comment, i, false);
                }
            });

            $('#mood-tracker-area .response textarea').val("");
            $("#statistics-content .initial-instructions").hide();
            
         });

        /* NOTIFICATION CREATION AND RESPONSES */
        // Notification functions are now in js/notifications.js module
        // Create local aliases for backward compatibility
        var clearNotification = NotificationsModule.clearNotification;
        var createNotification = NotificationsModule.createNotification;
        var createGoalEndNotification = NotificationsModule.createGoalEndNotification;
        
        // Initialize notifications module with required functions
        NotificationsModule.init(json, convertDateTimeToTimestamp, changeGoalStatus, placeGoalIntoLog, extendActiveGoal, endActiveGoal);
        
        // Baseline questionnaire initialization
        // Event handlers moved to js/baseline.js module
        BaselineModule.init(json, createNotification, retrieveStorageObject, setStorageObject);
        
        // Initialize UI module with json
        UIModule.init(json);
        
        // Initialize Goals module with dependencies
        var goalDependencies = {
            json: json,
            createNotification: createNotification,
            updateActionTable: updateActionTable,
            loadGoalTimerValues: loadGoalTimerValues,
            initiateGoalTimer: initiateGoalTimer,
            showActiveStatistics: showActiveStatistics,
            adjustFibonacciTimerToBoxes: adjustFibonacciTimerToBoxes,
            closeClickDialog: closeClickDialog
        };
        GoalsModule.init(goalDependencies);
        
        // Initialize Buttons module with dependencies
        var buttonDependencies = {
            createNotification: createNotification,
            updateActionTable: updateActionTable,
            placeActionIntoLog: placeActionIntoLog,
            shootConfetti: shootConfetti,
            showActiveStatistics: showActiveStatistics,
            initiateReport: initiateReport,
            openClickDialog: openClickDialog,
            initiateGoalTimer: initiateGoalTimer,
            initiateSmokeTimer: initiateSmokeTimer,
            initiateBoughtTimer: initiateBoughtTimer,
            adjustFibonacciTimerToBoxes: adjustFibonacciTimerToBoxes
        };
        ButtonsModule.init(json, buttonDependencies);

        // Goal functions are now in js/goals.js module
        // Create local aliases for backward compatibility
        function extendActiveGoal() {
            var dependencies = {
                changeGoalStatus: changeGoalStatus
            };
            GoalsModule.extendActiveGoal(json, dependencies);
        }
        
        function endActiveGoal() {
            var dependencies = {
                changeGoalStatus: changeGoalStatus,
                createNotification: createNotification,
                placeGoalIntoLog: placeGoalIntoLog,
                replaceLongestGoal: replaceLongestGoal,
                showActiveStatistics: showActiveStatistics,
                recalculateAverageTimeBetween: recalculateAverageTimeBetween,
                updateActionTable: updateActionTable,
                loadGoalTimerValues: loadGoalTimerValues,
                initiateGoalTimer: initiateGoalTimer,
                adjustFibonacciTimerToBoxes: adjustFibonacciTimerToBoxes
            };
            GoalsModule.endActiveGoal(json, dependencies);
        }

        /* GOAL LOG FUNCTION */
        function placeGoalIntoLog(startStamp, endStamp, goalType, placeBelow) {
            GoalsModule.placeGoalIntoLog(startStamp, endStamp, goalType, placeBelow, json, convertSecondsToDateFormat);
        }

        /* COST && USE LOG FUNCTION */
        function placeActionIntoLog(clickStamp, clickType, amountSpent, comment, smiley, placeBelow) {

            //data seems to be in order
            var endDateObj = new Date(parseInt(clickStamp + "000"));
            var dayOfTheWeek = endDateObj.toString().split(' ')[0];
            var shortHandDate = (endDateObj.getMonth() + 1) + "/" +
                endDateObj.getDate() + "/" +
                (endDateObj.getFullYear());
            var shortHandTimeHours = (endDateObj.getHours()),
                shortHandTimeMinutes = (endDateObj.getMinutes()),
                shortHandTimeAMPM = "am";
            if (shortHandTimeHours == 12) {
                shortHandTimeAMPM = "pm";
            } else if (shortHandTimeHours > 12) {
                shortHandTimeHours = shortHandTimeHours % 12;
                shortHandTimeAMPM = "pm";
            }
            if (shortHandTimeMinutes < 10) {
                shortHandTimeMinutes = "0" + shortHandTimeMinutes;
            }

            var shortHandTime = shortHandTimeHours + "<b>:</b>" + shortHandTimeMinutes + shortHandTimeAMPM;

            var titleHTML = "";
            var target = "#habit-log";

            if (clickType == "bought") {
                titleHTML = '<i class="fas fa-dollar-sign"></i>&nbsp;&nbsp;' + "You spent <b>$" + parseInt(amountSpent) + "</b> on it.";
                //target = "#cost-log";
            } else if (clickType == "used") {
                titleHTML = '<i class="fas fa-cookie-bite"></i>&nbsp;' + "You did it at <b>" + shortHandTime + "</b>.";
                //target = "#use-log";
            } else if (clickType == "craved") {
                titleHTML = '<i class="fas fa-ban"></i>&nbsp;' + "You resisted it at <b>" + shortHandTime + "</b>.";
                //target = "#use-log";
            } else if(clickType == "mood") {
                var scrubbedComment = comment.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                titleHTML = '<img class="img-fluid habit-log-icon smiley mood-' + smiley + '" src="assets/images/mood-smiley-' + smiley + '.png" />&nbsp;' + " <b>" + scrubbedComment + "</b>";
            }

            var template = '<div class="item ' + clickType + '-record">' +
                '<hr/><p class="title">' + titleHTML + '</p>' +
                '<p class="date" style="text-align:center;color:D8D8D8">' +
                '<span class="dayOfTheWeek">' + dayOfTheWeek + '</span>,&nbsp;' +
                '<span class="shortHandDate">' + shortHandDate + '</span>' +
                '</p>' +
                '</div><!--end habit-log item div-->';

                //console.log("TEMPLATE: ", clickType, template)

            if (json.option.logItemsToDisplay[clickType] === true) {
                if (placeBelow) {
                    $(target).append(template);
                } else {
                    $(target).prepend(template);
                }
                //and make sure the heading exists too
                $(target + "-heading").show();
            }
        }

        /* Format entries into HABIT LOG */
        function convertSecondsToDateFormat(rangeInSeconds, multiline) {
            return StatisticsModule.convertSecondsToDateFormat(rangeInSeconds, multiline);
        }

        /* Goal completion management */
        function changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo) {
            var result = GoalsModule.changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo);

            // Handle UI updates based on storage result
            if (result.wasExtended) {
                loadGoalTimerValues(result.totalSecondsUntilGoalEnd);
                    initiateGoalTimer();
                    showActiveStatistics();
                    adjustFibonacciTimerToBoxes("goal-timer");
            } else if (result.goalWasShorter) {
                    var message = "Your current goal was longer than the one you just requested. " +
                        "Don't worry if you can't make it all the way, just try a more manageable goal next time!";
                    createNotification(message);
                }
            
            return result;
        }

        /* CONVERT JSON TO LIVE STATS */
        function convertDateTimeToTimestamp(datePickerTarget, timePickerTarget) {
            var tempEndStamp = $(datePickerTarget).datepicker({ dateFormat: 'yy-mm-dd' }).val();
            tempEndStamp = Math.round(new Date(tempEndStamp).getTime() / 1000);

            //get time selection from form
            var requestedTimeEndHours = parseInt($(timePickerTarget + " select.time-picker-hour").val());

            //12 am is actually the first hour in a day... goddamn them.
            if (requestedTimeEndHours == 12) {
                requestedTimeEndHours = 0;
            }
            //account for am vs pm from userfriendly version of time input
            if ($(timePickerTarget + " select.time-picker-am-pm").val() == "PM") {
                requestedTimeEndHours = requestedTimeEndHours + 12;
            }

            tempEndStamp += requestedTimeEndHours * (60 * 60);
            return tempEndStamp;
        }

        function displayAverageTimeBetween(actionType, timeIncrement) {
            StatisticsModule.displayAverageTimeBetween(actionType, timeIncrement, json);
        }

        function recalculateAverageTimeBetween(actionType, timeIncrement) {
            StatisticsModule.recalculateAverageTimeBetween(actionType, timeIncrement, json, retrieveStorageObject);
        }

        function displayLongestGoal(timeIncrement) {
            StatisticsModule.displayLongestGoal(timeIncrement, json);
        }

        function replaceLongestGoal(start, end) {
            GoalsModule.replaceLongestGoal(start, end, json, convertSecondsToDateFormat);
        }

        // UI functions are now in js/ui.js module
        // Create local aliases for backward compatibility
        function toggleActiveStatGroups() {
            UIModule.toggleActiveStatGroups(json);
        }

        function hideInactiveStatistics() {
            UIModule.hideInactiveStatistics(json);
        }

        function shootConfetti() {
            UIModule.shootConfetti();
        }

        function showActiveStatistics() {
            UIModule.showActiveStatistics(json, recalculateAverageTimeBetween, displayLongestGoal);
        }

        /*SETTINGS MENU FUNCTIONS*/
        //undo last click
        function undoLastAction() {
            var undoneActionClickType = StorageModule.undoLastAction();

            //UNBREAK GOAL
            //if action could have broken a goal
            if (undoneActionClickType == "used" || undoneActionClickType == "bought") {
                var jsonObject = retrieveStorageObject();
                //cycle back through records until you find most recent goal
                for (var i = jsonObject["action"].length - 1; i >= 0; i--) {
                    var currRecord = jsonObject["action"][i];
                    var goalTypeIsRelevant = (currRecord.goalType == "both" || currRecord.goalType == undoneActionClickType);
                    if (goalTypeIsRelevant && currRecord.clickType == "goal") {
                        //if this first finds a goal which would have been broken by undoneActionClickType, 
                        //change this.status to active, exit loop 
                        changeGoalStatus(1, currRecord.goalType, -1);
                        break;

                    } else if (currRecord.clickType == undoneActionClickType) {
                        //if this first finds an action.clickType == undoneActionClickType, 
                        //then a goal could not have been broken, so exit loop without changing goal status
                        break;
                    }
                }
            }
            window.location.reload();

        }
        //reset all stats
        function clearActions() {
            StorageModule.clearStorage();
            window.location.reload();
        }

        /*SETTINGS MENU CLICK EVENTS */
        $("#undoActionButton").click(function (event) {
            event.preventDefault();
            if (confirm("Your last click will be undone - irreversibly. Are you sure?")) {
                undoLastAction();
            }
        });

        $("#clearTablesButton").click(function (event) {
            event.preventDefault();
            if (confirm("ALL your data will be cleared - irreversibly. Are you sure??")) {
                clearActions();
            }

        });

        /* CREATE NEW RECORD OF ACTION */
        // Now using StorageModule.updateActionTable from js/storage.js
        var updateActionTable = StorageModule.updateActionTable;

        // Adjust timer box sizing - now using UIModule
        function adjustFibonacciTimerToBoxes(timerId) {
            UIModule.adjustFibonacciTimerToBoxes(timerId, userWasInactive);
        }
        
        // Helper function for hiding zero value timer boxes - now using UIModule
        function hideZeroValueTimerBoxes(timerSection) {
            UIModule.hideZeroValueTimerBoxes(timerSection);
        }
        
        // Initialize UI module to set up global functions
        UIModule.init();

        //open more info div
        function openClickDialog(clickDialogTarget) {
            UIModule.openClickDialog(clickDialogTarget);
        }

        function closeClickDialog(clickDialogTarget) {
            UIModule.closeClickDialog(clickDialogTarget);
        }

        // Timer variables are now in js/timers.js module
        // Access via TimersModule
        var smokeTimer = TimersModule.smokeTimer;
        var boughtTimer = TimersModule.boughtTimer;
        var goalTimer = TimersModule.goalTimer;

        /*Actions on switch tab */

        $(document).delegate(".statistics-tab-toggler", 'click', function (e) {
            saveActiveTab();

            setTimeout(function () {
                toggleActiveStatGroups();
                hideInactiveStatistics();

                adjustFibonacciTimerToBoxes("goal-timer");
                adjustFibonacciTimerToBoxes("smoke-timer");
                adjustFibonacciTimerToBoxes("bought-timer");

            }, 0);

            $(".baseline-tab-toggler").removeClass("active");
            $(".settings-tab-toggler").removeClass("active");
            $(".reports-tab-toggler").removeClass("active");

            if( $('#settings-content').hasClass("active") ) {
                $('#settings-content').removeClass("active")
                $('#settings-content').attr("aria-expanded", false)
            }

            $(".statistics-tab-toggler").addClass("active");

            //close dropdown nav
            if ($("#options-collapse-menu").hasClass("show")) {
                $(".navbar-toggler").click();
            }

            //get them notifcations for useful reports
            initiateReport();
        });

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
            displayAverageTimeBetween("use", "total");
            displayAverageTimeBetween("use", "week");
            displayAverageTimeBetween("use", "month");
            displayAverageTimeBetween("cost", "total");
            displayAverageTimeBetween("cost", "week");
            displayAverageTimeBetween("cost", "month");

            $(".longestGoal.statistic").parent().hide();
            var bestTime = json.statistics.goal.longestGoal;
            if (bestTime.week !== "N/A") {
                $(".longestGoal.week.statistic").parent().show();
                displayLongestGoal("week");
            } else if (bestTime.month !== "N/A" && bestTime.month !== bestTime.week) {
                $(".longestGoal.month.statistic").parent().show();
                displayLongestGoal("month");
            }
            if (bestTime.total !== "N/A" 
                && bestTime.total !== bestTime.week
                && bestTime.total !== bestTime.month) {

                $(".longestGoal.total.statistic").parent().show();
                displayLongestGoal("total");
            }


            returnToActiveTab();
            hideTimersOnLoad();

            //after all is said and done 
            toggleActiveStatGroups();
            hideInactiveStatistics();

            //get them notifcations for useful reports
            initiateReport();

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

            toggleActiveStatGroups();
            hideInactiveStatistics();

            $(".settings-tab-toggler").click();
            $(".displayed-statistics-heading").hide();

            //ABSOLUTE NEW USER
            var introMessage = "<b>Welcome to Better Later</b> - the anonymous habit tracking app that shows you statistics about your habit as you go!";
            createNotification(introMessage);
        }

        // Button handlers moved to ButtonsModule

        //START USED TIMER
        function initiateSmokeTimer(requestedTimestamp) {
            return TimerStateManager.initiate('smoke', requestedTimestamp, json);
        }

        //USE DIALOG CLICK
        $(".use.log-more-info button.submit").click(function () {
            if (json.baseline.decreaseHabit == false) {
                shootConfetti();
            }
            var date = new Date();
            var timestampSeconds = Math.round(date / 1000);

            //get time selection from form
            var requestedTimeStartHours = parseInt($(".use.log-more-info select.time-picker-hour").val());
            var requestedTimeStartMinutes = parseInt($(".use.log-more-info select.time-picker-minute").val());

            var userDidItNow = $("#nowUseRadio").is(':checked');
            if( userDidItNow ) {
                requestedTimeStartHours = date.getHours();
                requestedTimeStartMinutes = date.getMinutes();
            }

            //12 am is actually the first hour in a day... goddamn them.
            if (requestedTimeStartHours == 12) {
                requestedTimeStartHours = 0;
            }
            //account for am vs pm from userfriendly version of time input
            if ($(".use.log-more-info select.time-picker-am-pm").val() == "PM") {
                requestedTimeStartHours = requestedTimeStartHours + 12;
            }

            var requestedTimeDiffSeconds = 0;
                requestedTimeDiffSeconds += date.getHours()*60*60 - requestedTimeStartHours*60*60;
                requestedTimeDiffSeconds += date.getMinutes()*60 - requestedTimeStartMinutes*60;

                //use requested time
                requestedTimestamp = timestampSeconds - requestedTimeDiffSeconds;

                //return to relevant screen
                $(".statistics-tab-toggler").click();

                //fake firstStampUses in json obj
                if (json.statistics.use.clickCounter == 0) {
                    json.statistics.use.firstClickStamp = json.statistics.use.firstClickStamp + timestampSeconds;

                } 

                json.statistics.use.clickCounter++;
                $("#use-total").html(json.statistics.use.clickCounter);

                // var currCravingsPerSmokes = Math.round(json.statistics.use.craveCounter / json.statistics.use.clickCounter * 10) / 10;
                // $("#avgDidntPerDid").html(currCravingsPerSmokes);

                json.statistics.use.cravingsInARow = 0;
                $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

                //start timer with optional param for past date
                var userDidItNow = $("#nowUseRadio").is(':checked');
                if (userDidItNow) {
                    //update relevant statistics
                    updateActionTable(timestampSeconds, "used");
                    placeActionIntoLog(timestampSeconds, "used", null, null, null, false);
                    initiateSmokeTimer();

                } else {
                    //user is selecting time that appears to be in the future
                    //will interpret as minus one day
                    var secondsToNow = date.getHours()*60*60 + date.getMinutes()*60;
                    var secondsToRequested = requestedTimeStartHours*60*60 + requestedTimeStartMinutes*60;

                    if( secondsToRequested > secondsToNow) {
                        //take one day off
                        requestedTimestamp = requestedTimestamp - (1*24*60*60);
                    }

                    //update relevant statistics
                    updateActionTable(requestedTimestamp, "used");
                    initiateSmokeTimer(requestedTimestamp);
                }
                
                var newTotals = {
                    total: parseInt( $(".statistic.use.totals.total").html() ) + 1,
                    week: parseInt( $(".statistic.use.totals.week").html() ) + 1,
                    month: parseInt( $(".statistic.use.totals.month").html() ) + 1,
                    year: parseInt( $(".statistic.use.totals.year").html() ) + 1,
                }
                $(".statistic.use.totals.total").html(newTotals.total);
                $(".statistic.use.totals.week").html(newTotals.week);
                $(".statistic.use.totals.month").html(newTotals.month);
                $(".statistic.use.totals.year").html(newTotals.year);

                var betweenClicks = {
                    total: json.statistics.use.betweenClicks.total,
                    week: json.statistics.use.betweenClicks.week,
                    month: json.statistics.use.betweenClicks.month,
                    year: json.statistics.use.betweenClicks.year 
                }


                $(".statistic.use.timeBetween.total").html(betweenClicks.total);
                $(".statistic.use.timeBetween.week").html(betweenClicks.week);
                $(".statistic.use.timeBetween.month").html(betweenClicks.month);
                $(".statistic.use.timeBetween.year").html(betweenClicks.year);

                //there is an active bought related goal
                if (json.statistics.goal.activeGoalUse !== 0 || json.statistics.goal.activeGoalBoth !== 0) {
                    
                    
                    var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)]
                    if (json.statistics.goal.activeGoalUse !== 0) {
                        var goalType = "use";
                        
                        json.statistics.goal.activeGoalUse = 0;

                    } else if (json.statistics.goal.activeGoalBoth !== 0) {
                        var goalType = "both";
                        
                        json.statistics.goal.activeGoalBoth = 0;

                    }

                    changeGoalStatus(2, goalType, requestedTimestamp);
                    createNotification(message);
                    clearInterval(goalTimer);

                    $("#goal-content .timer-recepticle").hide();
                    toggleActiveStatGroups();
                    hideInactiveStatistics();

                    //place a goal into the goal log
                    var startStamp = json.statistics.goal.lastClickStamp;
                    var actualEnd = requestedTimestamp;
                    placeGoalIntoLog(startStamp, actualEnd, goalType, false);

                    //if longest goal just happened longestGoal
                    replaceLongestGoal(startStamp, actualEnd)

                    //update number of goals
                    json.statistics.goal.completedGoals++;
                    $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);

                }
                
                initiateReport();

                showActiveStatistics();
                //keep lastClickStamp up to date while using app
                json.statistics.use.lastClickStamp = timestampSeconds;
                closeClickDialog(".use");

        });
        
        //notify user when requested times are for yesterday - Moved to UIModule

        $(".use.log-more-info button.cancel").click(function () {
            closeClickDialog(".use");
        });

        //START BOUGHT TIMER
        function initiateBoughtTimer() {
            return TimerStateManager.initiate('bought', undefined, json);
        }

        //GOAL TIMER	
        function initiateGoalTimer() {
            var dependencies = {
                toggleActiveStatGroups: toggleActiveStatGroups,
                hideInactiveStatistics: hideInactiveStatistics,
                changeGoalStatus: changeGoalStatus,
                placeGoalIntoLog: placeGoalIntoLog,
                replaceLongestGoal: replaceLongestGoal,
                showActiveStatistics: showActiveStatistics,
                createNotification: createNotification
            };
            return GoalsModule.initiateGoalTimer(json, dependencies);
        }

        //COST DIALOG CLICK
        $(".cost.log-more-info button.submit").click(function () {
            var amountSpent = $("#spentInput").val();

            if (!$.isNumeric(amountSpent)) {
                alert("Please enter in a number!");

            } else {

                //return to relevant screen
                $(".statistics-tab-toggler").click();

                var timestampSeconds = Math.round(new Date() / 1000);
                updateActionTable(timestampSeconds, "bought", amountSpent);

                //add record into log
                placeActionIntoLog(timestampSeconds, "bought", amountSpent, null, null, false);

                //fake firstStampBought in json obj
                if (json.statistics.cost.clickCounter == 0) {
                    json.statistics.cost.firstClickStamp = json.statistics.cost.firstClickStamp + timestampSeconds;

                } else if (json.statistics.cost.clickCounter == 1) {
                    json.statistics.cost.betweenClicks.total = timestampSeconds - json.statistics.cost.firstClickStamp;

                }

                //update display
                json.statistics.cost.clickCounter++;
                $("#bought-total").html(json.statistics.cost.clickCounter);

                //update spent in json
                json.statistics.cost.totals.total = parseInt(json.statistics.cost.totals.total) + parseInt(amountSpent);
                json.statistics.cost.totals.week = parseInt(json.statistics.cost.totals.week) + parseInt(amountSpent);
                json.statistics.cost.totals.month = parseInt(json.statistics.cost.totals.month) + parseInt(amountSpent);
                json.statistics.cost.totals.year = parseInt(json.statistics.cost.totals.year) + parseInt(amountSpent);

                // console.log("json.statistics.cost.totals after submit: ", json.statistics.cost.totals)
                //update display
                $(".statistic.cost.totals.total").html("$" + json.statistics.cost.totals.total);
                $(".statistic.cost.totals.week").html("$" + json.statistics.cost.totals.week );
                $(".statistic.cost.totals.month").html("$" + json.statistics.cost.totals.month );
                $(".statistic.cost.totals.year").html("$" + json.statistics.cost.totals.year );

                closeClickDialog(".cost");
                initiateBoughtTimer();
                showActiveStatistics();
                toggleActiveStatGroups();
                hideInactiveStatistics();
                adjustFibonacciTimerToBoxes("bought-timer");
                var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)]
                //there is an active bought related goal
                if (json.statistics.goal.activeGoalBought !== 0 || json.statistics.goal.activeGoalBoth !== 0) {
                    if (json.statistics.goal.activeGoalBought !== 0) {
                        var goalType = "bought";
                        json.statistics.goal.activeGoalBought = 0;

                    } else if (json.statistics.goal.activeGoalBoth !== 0) {
                        var goalType = "both";

                        json.statistics.goal.activeGoalBoth = 0;

                    }

                    changeGoalStatus(2, goalType, timestampSeconds);
                    createNotification(message);
                    clearInterval(goalTimer);

                    $("#goal-content .timer-recepticle").hide();
                    toggleActiveStatGroups();
                    hideInactiveStatistics();

                    //place a goal into the goal log
                    var startStamp = json.statistics.goal.lastClickStamp;
                    var actualEnd = timestampSeconds;
                    placeGoalIntoLog(startStamp, actualEnd, goalType, false);

                    //if longest goal just happened
                    replaceLongestGoal(startStamp, actualEnd)
                    
                    //update number of goals
                    json.statistics.goal.completedGoals++;
                    $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
                    showActiveStatistics();
                }
                //keep lastClickStamp up to date while using app
                json.statistics.cost.lastClickStamp = timestampSeconds;
            }

        });

        $(".cost.log-more-info button.cancel").click(function () {
            closeClickDialog(".cost");
        });

        // Calculate goal timer values - now using TimersModule
        function loadGoalTimerValues(totalSecondsUntilGoalEnd) {
            GoalsModule.loadGoalTimerValues(totalSecondsUntilGoalEnd, json);
        }

        //Restrict possible dates chosen in goal tab datepicker
        //restrictGoalRange();
        $("#goalEndPicker").datepicker({ minDate: 0 });
        //INITIALIZE GOAL DATE TIME PICKER
        $("#goalEndPicker").datepicker();

        //GOAL DIALOG CLICK - Moved to GoalsModule

        $(".goal.log-more-info button.cancel").click(function () {
            closeClickDialog(".goal");
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
            
            if(document.visibilityState == "hidden") {
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