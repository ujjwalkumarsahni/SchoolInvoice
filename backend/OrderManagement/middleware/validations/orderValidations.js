import Joi from 'joi';

export const validateCreateOrder = (req, res, next) => {
  const orderItemSchema = Joi.object({
    bookType: Joi.string().valid('ELP', 'LTE', 'CAC', 'CTF').required(),
    grade: Joi.string().valid(
      'Pre-Nursery', 'LKG', 'UKG', 
      'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
      'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9-12'
    ).when('bookType', {
      is: 'ELP',
      then: Joi.when('isIndividualBook', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      otherwise: Joi.required()
    }),
    bookName: Joi.string().trim(),
    quantity: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).required(),
    isIndividualBook: Joi.boolean().default(false),
    isComboPack: Joi.boolean().default(false)
  });

  const kitItemSchema = Joi.object({
    kitType: Joi.string().valid('Wonder Kit', 'Nexus Kit', 'Individual Kit').required(),
    kitName: Joi.string().trim().when('kitType', {
      is: 'Individual Kit',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    quantity: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).required()
  });

  const toAddressSchema = Joi.object({
    name: Joi.string().trim(),
    address: Joi.string().trim(),
    city: Joi.string().trim(),
    state: Joi.string().trim(),
    pincode: Joi.string().pattern(/^\d{6}$/),
    mobile: Joi.string().pattern(/^\d{10}$/),
    email: Joi.string().email()
  });

  const schema = Joi.object({
    school: Joi.string().hex().length(24).required(),
    academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/),
    orderItems: Joi.array().items(orderItemSchema).min(1).required(),
    kitItems: Joi.array().items(kitItemSchema),
    discount: Joi.number().min(0).default(0),
    toAddress: toAddressSchema
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  next();
};