export type Email = {
  id: string;
  sender: string;
  subject: string;
  date: string;
};

export type EmailActionResult = {
  success: boolean;
  message: string;
};
