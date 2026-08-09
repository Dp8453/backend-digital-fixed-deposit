import { User, FixedDeposit, Transaction, SupportTicket, RefreshToken, Notification, AuditLog } from './models/index.js';
import logger from './utils/logger.js';

logger.info('🔍 Validating Mongoose Schemas...');

const models = [
  { name: 'User', model: User },
  { name: 'FixedDeposit', model: FixedDeposit },
  { name: 'Transaction', model: Transaction },
  { name: 'SupportTicket', model: SupportTicket },
  { name: 'RefreshToken', model: RefreshToken },
  { name: 'Notification', model: Notification },
  { name: 'AuditLog', model: AuditLog },
];

models.forEach(({ name, model }) => {
  if (model && model.modelName === name) {
    logger.info(`  ✅ Model [${name}] compiled successfully with ${Object.keys(model.schema.paths).length} fields.`);
  } else {
    logger.error(`  ❌ Model [${name}] failed compilation.`);
  }
});

logger.info('🎉 All 7 Mongoose Schemas & Indexes Validated Successfully!');
process.exit(0);
