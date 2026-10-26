import { api } from './api';

// Copy and API call for each listing lifecycle action, shared by the detail page and dashboard.
export const ACTIONS = {
  claim: {
    run: api.claim,
    title: 'Claim this pickup?',
    body: 'You are committing to collect it within the pickup window. The donor will see your contact details.',
    confirm: 'Claim pickup',
    done: 'Pickup claimed. You can now see the donor’s contact details.',
  },
  unclaim: {
    run: api.unclaim,
    title: 'Release this claim?',
    body: 'The listing goes back on the board so another organisation can collect it.',
    confirm: 'Release claim',
    tone: 'danger',
    done: 'Claim released. The listing is back on the board.',
  },
  complete: {
    run: api.complete,
    title: 'Confirm the food was picked up?',
    body: 'This closes the listing and adds its meals to the impact total.',
    confirm: 'Confirm pickup',
    done: 'Pickup confirmed. Thank you for rescuing this food.',
  },
  cancel: {
    run: api.cancel,
    title: 'Cancel this listing?',
    body: 'It will be taken off the board. If someone has claimed it, let them know so they don’t make the trip.',
    confirm: 'Cancel listing',
    tone: 'danger',
    done: 'Listing cancelled.',
  },
  delete: {
    run: api.deleteListing,
    title: 'Delete this listing?',
    body: 'It will be removed permanently. This cannot be undone.',
    confirm: 'Delete listing',
    tone: 'danger',
    done: 'Listing deleted.',
  },
};
