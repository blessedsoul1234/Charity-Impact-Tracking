;; Impact Measurement Contract
;; Quantifies and reports actual outcomes

;; Define data variables
(define-map impact-metrics
  { project-id: uint, metric-id: uint }
  {
    name: (string-ascii 100),
    description: (string-ascii 500),
    target-value: uint,
    current-value: uint,
    unit: (string-ascii 20),
    last-updated: uint
  }
)

(define-map project-metric-counters { project-id: uint } uint)
(define-map authorized-reporters { project-id: uint } (list 10 principal))

;; Public functions
(define-public (add-impact-metric (project-id uint) (name (string-ascii 100)) (description (string-ascii 500)) (target-value uint) (unit (string-ascii 20)))
  (let
    (
      (metric-counter (default-to u0 (map-get? project-metric-counters { project-id: project-id })))
      (reporters (default-to (list) (map-get? authorized-reporters { project-id: project-id })))
    )
    ;; Check if caller is authorized
    (asserts! (or (is-authorized project-id tx-sender) (is-eq (len reporters) u0)) (err u1))

    ;; If no reporters yet, add caller as first reporter
    (if (is-eq (len reporters) u0)
      (map-set authorized-reporters { project-id: project-id } (list tx-sender))
      true
    )

    ;; Increment metric counter
    (map-set project-metric-counters { project-id: project-id } (+ metric-counter u1))

    ;; Create impact metric
    (map-set impact-metrics
      { project-id: project-id, metric-id: metric-counter }
      {
        name: name,
        description: description,
        target-value: target-value,
        current-value: u0,
        unit: unit,
        last-updated: block-height
      }
    )

    ;; Return success with metric ID
    (ok metric-counter)
  )
)

(define-public (update-metric-value (project-id uint) (metric-id uint) (new-value uint))
  (let
    (
      (metric (map-get? impact-metrics { project-id: project-id, metric-id: metric-id }))
    )
    ;; Check if metric exists and caller is authorized
    (asserts! (is-some metric) (err u1))
    (asserts! (is-authorized project-id tx-sender) (err u2))

    ;; Update metric value
    (map-set impact-metrics
      { project-id: project-id, metric-id: metric-id }
      (merge (unwrap-panic metric)
        {
          current-value: new-value,
          last-updated: block-height
        }
      )
    )

    ;; Return success
    (ok true)
  )
)

(define-public (add-reporter (project-id uint) (reporter principal))
  (let
    (
      (reporters (default-to (list) (map-get? authorized-reporters { project-id: project-id })))
    )
    ;; Check if caller is authorized
    (asserts! (is-authorized project-id tx-sender) (err u1))
    ;; Check if list is not full
    (asserts! (< (len reporters) u10) (err u2))
    ;; Check if reporter is not already in the list
    (asserts! (is-none (index-of reporters reporter)) (err u3))

    ;; Add reporter to the list
    (map-set authorized-reporters
      { project-id: project-id }
      (unwrap-panic (as-max-len? (append reporters reporter) u10))
    )

    ;; Return success
    (ok true)
  )
)

;; Helper functions
(define-private (is-authorized (project-id uint) (caller principal))
  (let
    (
      (reporters (default-to (list) (map-get? authorized-reporters { project-id: project-id })))
    )
    (is-some (index-of reporters caller))
  )
)

;; Read-only functions
(define-read-only (get-impact-metric (project-id uint) (metric-id uint))
  (map-get? impact-metrics { project-id: project-id, metric-id: metric-id })
)

(define-read-only (get-metric-count (project-id uint))
  (default-to u0 (map-get? project-metric-counters { project-id: project-id }))
)

(define-read-only (get-authorized-reporters (project-id uint))
  (default-to (list) (map-get? authorized-reporters { project-id: project-id }))
)

