// ==UserScript==
// @name         See moderation votes if you can't see them normally
// @description  Show moderation votes on SE sites
// @version      1.0
// @namespace    Spevacus
// @author       Spevacus
//
// @match      *://*.stackoverflow.com/questions/*
// @match      *://*.stackoverflow.com/review/*
// @exclude    /^https://(?:[^/]+\.)?stackoverflow.com/review/(?:[^/]+/)?(stats|history)/
// @match      *://*.serverfault.com/questions/*
// @match      *://*.serverfault.com/review/*
// @exclude    /^https://(?:meta\.)?serverfault.com/review/(?:[^/]+/)?(stats|history)/
// @match      *://*.superuser.com/questions/*
// @match      *://*.superuser.com/review/*
// @exclude    /^https://(?:meta\.)?superuser.com/review/(?:[^/]+/)?(stats|history)/
// @match      *://*.askubuntu.com/questions/*
// @match      *://*.askubuntu.com/review/*
// @exclude    /^https://(?:meta\.)?askubuntu.com/review/(?:[^/]+/)?(stats|history)/
// @match      *://*.mathoverflow.com/questions/*
// @match      *://*.mathoverflow.com/review/*
// @exclude    /^https://(?:meta\.)?mathoverflow.net/review/(?:[^/]+/)?(stats|history)/
// @match      *://*.stackapps.com/questions/*
// @match      *://*.stackapps.com/review/*
// @exclude    /^https://stackapps.com/review/(?:[^/]+/)?(stats|history)/
// @match      *://*.stackexchange.com/questions/*
// @match      *://*.stackexchange.com/review/*
// @match      *://*.meta.stackexchange.com/questions/*
// @match      *://*.meta.stackexchange.com/review/*
// @exclude    /^https://[^/]+\.stackexchange.com/review/(?:[^/]+/)?(stats|history)/
// @grant      none
// ==/UserScript==
/* global $, StackExchange */

const canSeeDeleteVotes = StackExchange?.options.user?.canSeeDeletedPosts;
const canSeeCloseVotes = $('.js-close-question-link').length > 0;

(async () => {
    'use strict';
    if (canSeeDeleteVotes && canSeeCloseVotes){
        return;
    }
    const pathName = window.location.pathname;
    const questionId = StackExchange.question.getQuestionId();

    if (!pathName.startsWith("/review/")) {
        const result = await fetchVotes(questionId);
        appendButtons(result);
    } else {
        const reviewRegex = /^\/review\/(next-task|task-reviewed)/;
        $(document)
            .ajaxComplete(async (event, request, settings) => {
            if (reviewRegex.test(settings.url)) {
                let reviewTitle = $('.fs-title')[0];
                // If the review pertains to a question, include the buttons.
                // NICETOHAVE: If looking at an Answer review, append buttons to the Question panel's post menu
                // This way, a user can go to that tab to see the moderation votes on it without manually navigating
                if(reviewTitle.innerText.includes('question')) {
                    const result = await fetchVotes(questionId);
                    appendButtons(result);
                }
            }
        });
    }
})();

function appendButtons(result) {
    const voteInformation = result?.items[0];
    if (!voteInformation){
        return;
    }
    console.log(`API quota remaining after looking for moderation votes: ${result.quota_remaining}`);
    let question = $('#question');
    let status = question.find('aside.s-notice b');
    let statusText = status.length > 0 ? status[0].innerText : '';
    let closed = statusText.startsWith('Closed') || statusText.startsWith("This question already has");
    if(!canSeeCloseVotes) {
        let voteType = closed ? "Reopen" : "Close";
        let voteCount = closed ? voteInformation.reopen_vote_count : voteInformation.close_vote_count;
        createModVoteButton(result.quota_remaining, voteCount, voteType);
    }
    if(!canSeeDeleteVotes) {
        if(closed) {
            createModVoteButton(result.quota_remaining, voteInformation.delete_vote_count, "Delete");
        }
    }
}

function createModVoteButton(quotaRemaining, voteCount, voteType) {
    let button = $(`<div class="flex--item"><i><a title="(Quota: ${quotaRemaining}) The current ${voteType} vote count, which you do not have the privilege to cast.">${voteType} (${voteCount})</a></i></div>`)[0];
    let menuLocation = $('.js-post-menu')[0].children[0];
    let insertIndex = voteType === "Delete" ? 4 : 3;
    menuLocation.insertBefore(button, menuLocation.children[insertIndex]);
}

// This code block + filter created Little Nuts https://stackapps.com/q/9170 (my API key though)
async function fetchVotes(questionId) {
    const apiUrl = `https://api.stackexchange.com/2.3/questions/`;
    const questionFilter = '!)rbHxFp0gYkdLgKAljfv';
    const site = window.location.hostname;
    const key = 'rl_tn6FGADMH3DzecqKmjaqzxeQ7';

    const response = await fetch(`${apiUrl}${questionId}?filter=${questionFilter}&site=${site}&key=${key}`);

    const result = await response.json();

    return result;
}