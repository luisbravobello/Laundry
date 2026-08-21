using System.Windows;
using System.Windows.Controls;
using SyncOps.Laundry.DesktopUI.ViewModels;

namespace SyncOps.Laundry.DesktopUI.Views.Pages;

public partial class TallerKanbanView : UserControl
{
    public TallerKanbanView()
    {
        InitializeComponent();
    }

    private async void UserControl_Loaded(object sender, RoutedEventArgs e)
    {
        if (DataContext is TallerKanbanViewModel vm)
        {
            await vm.CargarKanbanAsync();
        }
    }
}
