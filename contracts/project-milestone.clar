;; Project Milestone Contract
;; Defines and tracks charitable objectives

;; Define data variables
(define-map projects
  { project-id: uint }
  {
    name: (string-ascii 100),
    description: (string-ascii 500),
    target-amount: uint,
    start-height: uint,
    end-height: uint,
    owner: principal
  }
)

(define-map milestones
  { project-id: uint, milestone-id: uint }
  {
    description: (string-ascii 500),
    target-completion: uint,
    is-completed: bool,
    completion-height: (optional uint),
    funds-allocated: uint
  }
)

(define-data-var project-counter uint u0)
(define-map project-milestone-counters { project-id: uint } uint)

;; Public functions
(define-public (create-project (name (string-ascii 100)) (description (string-ascii 500)) (target-amount uint) (duration uint))
  (let
    (
      (project-id (var-get project-counter))
      (start-height block-height)
      (end-height (+ block-height duration))
    )
    ;; Increment project counter
    (var-set project-counter (+ project-id u1))

    ;; Initialize milestone counter for this project
    (map-set project-milestone-counters { project-id: project-id } u0)

    ;; Create project
    (map-set projects
      { project-id: project-id }
      {
        name: name,
        description: description,
        target-amount: target-amount,
        start-height: start-height,
        end-height: end-height,
        owner: tx-sender
      }
    )

    ;; Return success with project ID
    (ok project-id)
  )
)

(define-public (add-milestone (project-id uint) (description (string-ascii 500)) (target-completion uint) (funds-allocated uint))
  (let
    (
      (project (map-get? projects { project-id: project-id }))
      (milestone-counter (default-to u0 (map-get? project-milestone-counters { project-id: project-id })))
    )
    ;; Check if project exists and caller is owner
    (asserts! (is-some project) (err u1))
    (asserts! (is-eq (get owner (unwrap-panic project)) tx-sender) (err u2))

    ;; Increment milestone counter
    (map-set project-milestone-counters { project-id: project-id } (+ milestone-counter u1))

    ;; Create milestone
    (map-set milestones
      { project-id: project-id, milestone-id: milestone-counter }
      {
        description: description,
        target-completion: target-completion,
        is-completed: false,
        completion-height: none,
        funds-allocated: funds-allocated
      }
    )

    ;; Return success with milestone ID
    (ok milestone-counter)
  )
)

(define-public (complete-milestone (project-id uint) (milestone-id uint))
  (let
    (
      (project (map-get? projects { project-id: project-id }))
      (milestone (map-get? milestones { project-id: project-id, milestone-id: milestone-id }))
    )
    ;; Check if project and milestone exist and caller is owner
    (asserts! (is-some project) (err u1))
    (asserts! (is-some milestone) (err u2))
    (asserts! (is-eq (get owner (unwrap-panic project)) tx-sender) (err u3))

    ;; Update milestone as completed
    (map-set milestones
      { project-id: project-id, milestone-id: milestone-id }
      (merge (unwrap-panic milestone)
        {
          is-completed: true,
          completion-height: (some block-height)
        }
      )
    )

    ;; Return success
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-project (project-id uint))
  (map-get? projects { project-id: project-id })
)

(define-read-only (get-milestone (project-id uint) (milestone-id uint))
  (map-get? milestones { project-id: project-id, milestone-id: milestone-id })
)

(define-read-only (get-milestone-count (project-id uint))
  (default-to u0 (map-get? project-milestone-counters { project-id: project-id }))
)

