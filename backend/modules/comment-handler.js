// Handles all routing and all input / output for the comments database

const express = require('express');
const router = express.Router();

const db = require('../database');
const { requireAuth } = require('./auth-middleware');

// Helper function to load all the comments from the database in a page (20 comments per page)
function loadComments(userId, currentPage, PAGE_SIZE) {
    const offset = (currentPage - 1) * PAGE_SIZE;

    return db.prepare(`
    SELECT
        comments.id,
        comments.text,
        comments.created_at,
        users.display_name,
        users.name_color,
        COALESCE(SUM(comment_votes.vote), 0) AS points,
        MAX(CASE WHEN comment_votes.user_id = ? THEN comment_votes.vote END) AS user_vote
    FROM comments
    LEFT JOIN comment_votes ON comment_votes.comment_id = comments.id
    JOIN users ON comments.user_id = users.id
    GROUP BY comments.id
    ORDER BY comments.created_at DESC
    LIMIT ? OFFSET ?`
    ).all(userId, PAGE_SIZE, offset);
}

// Helper function to render the comments from loadComments() onto the page
function renderCommentsPage(req, res) {
    const PAGE_SIZE = 20;
    const totalComments = db.prepare(`SELECT COUNT(*) AS total FROM comments`).get().total;
    const totalPages = Math.ceil(totalComments / PAGE_SIZE);

    // Catch invalid page numbers
    const requestedPage = parseInt(req.query.page, 10) || 1;
    const currentPage = Math.min(
        Math.max(1, requestedPage),
        totalPages
    );

    const comments = loadComments(req.session.userId, currentPage, PAGE_SIZE);
    
    // Setup variables to pass to comments page
    let pages = {
        currentPage: currentPage,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: (currentPage < totalPages) ? currentPage + 1 : null,
        totalComments: totalComments,
    }
    
    // Setup data for buttons of the next 5 pages (if they exist)
    if(currentPage !== totalPages) pages.lastPage = totalPages;
    const index = []
    for(let i = 1; i <= 5; i++){
        if (currentPage + i > totalPages - 1) break;
        index.push(currentPage + i);
    }
    if(index.length) pages.index = index;

    res.render('comments', {user: req.session, comments: comments, page: pages});
}

// Render Comments page
router.get('/comments', requireAuth, (req, res) => {
    renderCommentsPage(req, res);
});

// Handle new comment
router.post('/comment', requireAuth, (req, res) => {
    const comment = req.body.comment;
    db.prepare('INSERT INTO comments (user_id, text) VALUES (?, ?)').run(req.session.userId, comment);
    renderCommentsPage(req, res);
});

// Add or remove points based on vote to a comment
router.post('/comment/vote', requireAuth, (req, res) => {
    const { commentId, vote } = req.body;
    const userId = req.session.userId;

    // Check for invalid data
    if (!commentId || !vote) {
        return res.status(400).send('Missing commentId or vote');
    }
    
    // Check for existing vote
    const oldVote = db.prepare(`
        SELECT vote
        FROM comment_votes
        WHERE user_id = ? AND comment_id = ?
    `).get(userId, commentId);
            
    //If vote exists, override old vote
    const voteInt = parseInt(vote, 10);
    if (oldVote && oldVote.vote === voteInt) { // Same vote, remove
        db.prepare(`
            DELETE FROM comment_votes
            WHERE user_id = ? AND comment_id = ?
        `).run(userId, commentId);
    } else { // different vote, override
        db.prepare(`
            INSERT INTO comment_votes (user_id, comment_id, vote)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, comment_id)
            DO UPDATE SET vote = excluded.vote
        `).run(userId, commentId, vote);
    }
    renderCommentsPage(req, res);
});

// Render add comment form
router.get('/comment/new', requireAuth, (req, res) => {
    res.render('comment/new');
});

module.exports = router;