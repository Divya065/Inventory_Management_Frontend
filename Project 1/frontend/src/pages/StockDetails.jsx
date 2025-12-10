import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { commentService } from '../services/commentService'
import { useAuth } from '../contexts/AuthContext'
import './StockDetails.css'

const StockDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [stock, setStock] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentForm, setCommentForm] = useState({ title: '', content: '' })
  const [showCommentForm, setShowCommentForm] = useState(false)

  useEffect(() => {
    loadStock()
    loadComments()
  }, [id])

  const loadStock = async () => {
    try {
      setError('') // Clear previous errors
      const data = await stockService.getById(id)
      if (data) {
        setStock(data)
      } else {
        setError('Stock not found')
      }
    } catch (err) {
      console.error('Error loading stock:', err)
      let errorMessage = 'Failed to load stock details'
      
      if (err.response) {
        const status = err.response.status
        if (status === 404) {
          errorMessage = 'Stock not found'
        } else if (status === 401) {
          errorMessage = 'You are not authenticated. Please login again.'
        } else if (status === 403) {
          errorMessage = 'You do not have permission to view this stock.'
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message
        } else {
          errorMessage = `Failed to load stock (Error ${status})`
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const data = await commentService.getAll()
      const stockComments = data.filter(c => c.stockId === parseInt(id))
      setComments(stockComments)
    } catch (err) {
      console.error('Failed to load comments', err)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      alert('Please login to add comments')
      return
    }

    // Validate form data
    if (!commentForm.title || commentForm.title.trim().length < 5) {
      alert('Title must be at least 5 characters long')
      return
    }
    if (!commentForm.content || commentForm.content.trim().length < 5) {
      alert('Content must be at least 5 characters long')
      return
    }

    console.log('Submitting comment:', { stockId: id, commentForm })
    console.log('Comment form data being sent:', JSON.stringify(commentForm, null, 2))
    try {
      await commentService.create(id, commentForm)
      setCommentForm({ title: '', content: '' })
      setShowCommentForm(false)
      loadComments()
    } catch (err) {
      console.error('Comment creation error:', err)
      console.error('Error response data:', err.response?.data)
      
      // Extract validation errors from ModelState
      let errorMessage = 'Failed to create comment'
      if (err.response?.data) {
        const data = err.response.data
        // Check for ModelState errors (ASP.NET Core format)
        if (data.title && Array.isArray(data.title)) {
          errorMessage = data.title[0]
        } else if (data.content && Array.isArray(data.content)) {
          errorMessage = data.content[0]
        } else if (data.Title && Array.isArray(data.Title)) {
          errorMessage = data.Title[0]
        } else if (data.Content && Array.isArray(data.Content)) {
          errorMessage = data.Content[0]
        } else if (data.message) {
          errorMessage = data.message
        } else if (typeof data === 'string') {
          errorMessage = data
        } else {
          // Try to extract any error message
          const errorKeys = Object.keys(data)
          if (errorKeys.length > 0) {
            const firstError = data[errorKeys[0]]
            if (Array.isArray(firstError)) {
              errorMessage = firstError[0]
            } else if (typeof firstError === 'string') {
              errorMessage = firstError
            }
          }
        }
      }
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await commentService.delete(commentId)
        await loadComments() // Reload comments after successful deletion
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to delete comment'
        alert(`Error: ${errorMsg}`)
        console.error('Error deleting comment:', err)
      }
    }
  }

  if (loading) {
    return <div className="loading">Loading stock details...</div>
  }

  if (error || !stock) {
    return (
      <div className="error-container">
        <div className="error">{error || 'Stock not found'}</div>
        <Link to="/stocks" className="btn btn-secondary">Back to Stocks</Link>
      </div>
    )
  }

  return (
    <div className="stock-details-page">
      <div className="stock-details-header">
        <Link to="/stocks" className="btn btn-secondary">← Back to Stocks</Link>
        {isAuthenticated && (
          <Link to={`/stocks/${id}/edit`} className="btn btn-primary">
            Edit Stock
          </Link>
        )}
      </div>

      <div className="stock-details-card">
        <div className="stock-details-main">
          <h1>{stock.symbol}</h1>
          <h2>{stock.companyName}</h2>
          <div className="stock-info-grid">
            <div className="info-item">
              <span className="info-label">ID</span>
              <span className="info-value">#{stock.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Industry</span>
              <span className="info-value">{stock.industry}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Purchase Price</span>
              <span className="info-value">${stock.purchase}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Dividend</span>
              <span className="info-value">${stock.lastDiv}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Market Cap</span>
              <span className="info-value">${stock.marketCap?.toLocaleString() || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="comments-section">
        <div className="comments-header">
          <h2>Comments ({comments.length})</h2>
          {isAuthenticated && (
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="btn btn-primary"
            >
              {showCommentForm ? 'Cancel' : 'Add Comment'}
            </button>
          )}
        </div>

        {showCommentForm && isAuthenticated && (
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <div className="form-group">
              <label htmlFor="comment-title">Title</label>
              <input
                type="text"
                id="comment-title"
                value={commentForm.title}
                onChange={(e) => setCommentForm({ ...commentForm, title: e.target.value })}
                required
                placeholder="Comment title"
                minLength={5}
                maxLength={280}
              />
            </div>
            <div className="form-group">
              <label htmlFor="comment-content">Content</label>
              <textarea
                id="comment-content"
                value={commentForm.content}
                onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                required
                placeholder="Write your comment..."
                rows="4"
                minLength={5}
                maxLength={280}
              />
            </div>
            <button type="submit" className="btn btn-primary">Submit Comment</button>
          </form>
        )}

        {comments.length === 0 ? (
          <div className="no-comments">No comments yet. Be the first to comment!</div>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <h4>{comment.title}</h4>
                  {isAuthenticated && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="comment-content">{comment.content}</p>
                <div className="comment-footer">
                  <span className="comment-author">By: {comment.createdBy || 'Unknown'}</span>
                  <span className="comment-date">
                    {comment.createdOn ? new Date(comment.createdOn).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StockDetails








