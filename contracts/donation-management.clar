;; Donation Management Contract
;; c

;; Define data variables
(define-data-var total-donations uint u0)
(define-map donors principal uint)
(define-map donation-details
  { donor: principal, donation-id: uint }
  { amount: uint, timestamp: uint, campaign-id: (optional uint) }
)
(define-data-var donation-counter uint u0)

;; Public functions
(define-public (donate (amount uint) (campaign-id (optional uint)))
  (let
    (
      (donor tx-sender)
      (donation-id (var-get donation-counter))
      (current-donor-total (default-to u0 (map-get? donors donor)))
    )
    ;; Update donation counter
    (var-set donation-counter (+ donation-id u1))

    ;; Record donation details
    (map-set donation-details
      { donor: donor, donation-id: donation-id }
      {
        amount: amount,
        timestamp: block-height,
        campaign-id: campaign-id
      }
    )

    ;; Update donor's total
    (map-set donors donor (+ current-donor-total amount))

    ;; Update total donations
    (var-set total-donations (+ (var-get total-donations) amount))

    ;; Return success
    (ok donation-id)
  )
)

;; Read-only functions
(define-read-only (get-total-donations)
  (var-get total-donations)
)

(define-read-only (get-donor-total (donor principal))
  (default-to u0 (map-get? donors donor))
)

(define-read-only (get-donation-details (donor principal) (donation-id uint))
  (map-get? donation-details { donor: donor, donation-id: donation-id })
)

