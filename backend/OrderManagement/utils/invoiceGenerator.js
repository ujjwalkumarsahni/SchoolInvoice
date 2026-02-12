import { v4 as uuidv4 } from "uuid";
import moment from "moment";

// Generate unique invoice number: SchoolName(4 letters)/Year/UniqueID
export const generateInvoiceNumber = (schoolName) => {
  const schoolCode = schoolName.substring(0, 4).toUpperCase().replace(/\s/g, '');
  const year = moment().format('YYYY');
  const uniqueId = uuidv4().substring(0, 8).toUpperCase();
  
  return `${schoolCode}/${year}/${uniqueId}`;
};

// Generate invoice details for dispatch
export const generateInvoiceDetails = (order, school) => {
  const currentDate = moment().format('DD/MM/YYYY');
  
  return {
    from: {
      name: "Aaklan It Solutions Pvt Ltd",
      address: "IT - 9(A, EPIP, IT Park Rd, near Hotel Marigold, Sitapura Industrial Area, Sitapura, Jaipur, Rajasthan 302022",
      contact: "Phone: +91-95716 77609, Email: info@aaklan.com"
    },
    to: {
      name: school.name,
      address: school.address,
      contact: `Phone: ${school.mobile}, Email: ${school.email}`
    },
    date: currentDate,
    invoiceNumber: order.invoiceNumber,
    items: [
      ...order.books.map(book => ({
        description: `${book.bookName} (${book.program} - ${book.grade})`,
        quantity: book.quantity,
        unitPrice: book.unitPrice,
        total: book.totalPrice
      })),
      ...order.kits.map(kit => ({
        description: kit.kitType === 'Individual' ? kit.kitName : kit.kitType,
        quantity: kit.quantity,
        unitPrice: kit.unitPrice,
        total: kit.totalPrice
      }))
    ],
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.totalAfterDiscount
  };
};