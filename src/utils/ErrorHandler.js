import Swal from "sweetalert2";

export default function ThrowError({ title, text, icon, confirmButtonText }) {
  Swal.fire({
    title,
    text,
    icon,
    background: "rgb(12, 12, 10)",
    color: "#EEEEEE",
    confirmButtonColor: "#3085d6",
    confirmButtonText
  })
}
